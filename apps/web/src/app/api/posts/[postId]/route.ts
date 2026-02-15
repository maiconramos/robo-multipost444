import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { serializePost } from "@/lib/api/serializers";
import { getStorage, getStorageByProvider } from "@/lib/storage";
import type { Platform } from "@/lib/platforms/types";
import {
  extractPlatformMediaReferences,
  mediaItemSchema,
  type NormalizedPlatformPayload,
  platformPayloadSchema,
  validateAndNormalizePlatformPayloads,
} from "@/lib/posts/platform-settings-schema";
import {
  resolvePlatformSelections,
  type ResolvedPlatformSelectionContext,
} from "@/lib/posts/platform-selection";
import { validateScheduledAt } from "@/lib/posts/scheduling";

const updatePostSchema = z.object({
  content: z.string().max(5000).optional(),
  platforms: z.array(platformPayloadSchema).min(1).optional(),
  mediaItems: z.array(mediaItemSchema).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  timezone: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId: workspace.id,
      },
      include: {
        mediaItems: true,
        platformPosts: true,
        cronJob: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post: serializePost(post) });
  } catch (error) {
    return handleApiError(error, "GET /api/posts/[postId] error");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json();
    const parsed = updatePostSchema.parse(body);

    const existing = await prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId: workspace.id,
      },
      include: {
        cronJob: true,
        mediaItems: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let normalizedPlatforms: NormalizedPlatformPayload[] | undefined;
    let resolvedSelection: ResolvedPlatformSelectionContext | undefined;

    if (parsed.platforms) {
      const selectionResult = await resolvePlatformSelections({
        db: prisma,
        workspaceId: workspace.id,
        platforms: parsed.platforms,
      });

      if (!selectionResult.ok) {
        return NextResponse.json(
          {
            error: selectionResult.error,
            issues: selectionResult.issues,
          },
          { status: 400 },
        );
      }

      const mediaItemsForValidation = parsed.mediaItems
        ? parsed.mediaItems
        : existing.mediaItems.map((item) => ({
            type: item.type as "image" | "video",
            url: item.url,
            key: item.key ?? undefined,
            provider:
              item.provider === "VERCEL_BLOB" ||
              item.provider === "S3_COMPAT" ||
              item.provider === "CLOUDFLARE_R2" ||
              item.provider === "URL_ONLY" ||
              item.provider === "late"
                ? (item.provider as "VERCEL_BLOB" | "S3_COMPAT" | "CLOUDFLARE_R2" | "URL_ONLY" | "late")
                : undefined,
            filename: item.filename ?? undefined,
            contentType: item.contentType ?? undefined,
            width: item.width ?? undefined,
            height: item.height ?? undefined,
            size: item.size ?? undefined,
            duration: item.duration ?? undefined,
          }));

      const normalizedResult = validateAndNormalizePlatformPayloads({
        platforms: selectionResult.data.selections,
        mediaItems: mediaItemsForValidation,
      });

      if (!normalizedResult.ok) {
        return NextResponse.json(
          {
            error: normalizedResult.error,
            issues: normalizedResult.issues,
          },
          { status: 400 },
        );
      }

      const missingProviderIdentifierIndex = normalizedResult.data.findIndex(
        (entry) => !entry.providerIdentifier,
      );
      if (missingProviderIdentifierIndex !== -1) {
        return NextResponse.json(
          {
            error: "Provider identifier is required for selected platform account.",
            issues: [
              {
                path: `platforms.${missingProviderIdentifierIndex}.providerIdentifier`,
                message: "Provider identifier is required for selected platform account.",
                accountId: normalizedResult.data[missingProviderIdentifierIndex]?.accountId,
                platform: normalizedResult.data[missingProviderIdentifierIndex]?.platform,
              },
            ],
          },
          { status: 400 },
        );
      }

      resolvedSelection = selectionResult.data;
      normalizedPlatforms = normalizedResult.data;
    }

    const hasScheduledForChange = Object.prototype.hasOwnProperty.call(parsed, "scheduledFor");
    let scheduledAt: Date | null | undefined;

    if (hasScheduledForChange) {
      if (parsed.scheduledFor) {
        scheduledAt = new Date(parsed.scheduledFor);
        const scheduleValidation = validateScheduledAt(scheduledAt);
        if (!scheduleValidation.ok) {
          return NextResponse.json(
            {
              error: scheduleValidation.message,
              minScheduledFor: scheduleValidation.minScheduledAt.toISOString(),
            },
            { status: 400 },
          );
        }
      } else {
        scheduledAt = null;
      }
    }

    const post = await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          ...(resolvedSelection
            ? {
                socialAccountId: resolvedSelection.primaryAccountId,
                profileId: resolvedSelection.profileId,
                providerType: resolvedSelection.primaryProviderType,
              }
            : {}),
          ...(parsed.content !== undefined
            ? { content: parsed.content.trim().length > 0 ? parsed.content : null }
            : {}),
          ...(parsed.timezone !== undefined ? { timezone: parsed.timezone } : {}),
          ...(hasScheduledForChange
            ? {
                scheduledFor: scheduledAt,
                status: scheduledAt ? "scheduled" : "draft",
                ...(scheduledAt ? {} : { queueId: null }),
              }
            : {}),
        },
      });

      if (parsed.mediaItems) {
        await tx.mediaItem.deleteMany({ where: { postId } });

        if (parsed.mediaItems.length > 0) {
          await tx.mediaItem.createMany({
            data: parsed.mediaItems.map((media) => ({
              postId,
              type: media.type,
              url: media.url,
              key: media.key,
              provider: media.provider ?? "URL_ONLY",
              filename: media.filename,
              contentType: media.contentType,
              width: media.width,
              height: media.height,
              size: media.size,
              duration: media.duration,
            })),
          });
        }
      }

      if (parsed.platforms && normalizedPlatforms) {
        await tx.platformPost.deleteMany({ where: { postId } });

        await tx.platformPost.createMany({
          data: normalizedPlatforms.map((entry) => ({
            postId,
            platform: entry.platform,
            accountId: entry.accountId,
            providerIdentifier: entry.providerIdentifier as string,
            customContent: entry.customContent,
            platformData:
              entry.platformSpecificData as
                | Prisma.InputJsonValue
                | undefined,
            status: "pending",
          })),
        });
      }

      if (hasScheduledForChange) {
        if (scheduledAt) {
          await tx.cronJob.upsert({
            where: { postId },
            create: {
              postId,
              scheduledAt,
              status: "pending",
              attempts: existing.cronJob?.attempts ?? 0,
              maxAttempts: existing.cronJob?.maxAttempts ?? 3,
            },
            update: {
              scheduledAt,
              status: "pending",
              lastError: null,
              lockedAt: null,
              lockedBy: null,
              completedAt: null,
            },
          });
        } else {
          await tx.cronJob.deleteMany({ where: { postId } });
        }
      }

      const withRelations = await tx.post.findUnique({
        where: { id: postId },
        include: {
          mediaItems: true,
          platformPosts: true,
          cronJob: true,
        },
      });

      if (!withRelations) {
        throw new Error("NOT_FOUND");
      }

      return withRelations;
    });

    return NextResponse.json({ post: serializePost(post) });
  } catch (error) {
    return handleApiError(error, "PUT /api/posts/[postId] error");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
        mediaItems: {
          select: {
            id: true,
            key: true,
            provider: true,
          },
        },
        platformPosts: {
          select: {
            id: true,
            platform: true,
            platformData: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let defaultStorage: ReturnType<typeof getStorage> | null = null;
    try {
      defaultStorage = getStorage();
    } catch (error) {
      console.error(
        "Failed to initialize default storage provider for media cleanup:",
        error
      );
    }

    const thumbnailMedia = post.platformPosts.flatMap((platformPost) =>
      extractPlatformMediaReferences({
        platform: platformPost.platform as Platform,
        platformSpecificData: platformPost.platformData,
      }).map((reference, index) => ({
        id: `${platformPost.id}:thumbnail:${index}`,
        key: reference.key,
        provider: reference.provider,
      })),
    );

    const mediaToDelete = [
      ...post.mediaItems.map((mediaItem) => ({
        id: mediaItem.id,
        key: mediaItem.key ?? undefined,
        provider: mediaItem.provider ?? undefined,
      })),
      ...thumbnailMedia,
    ];

    await Promise.all(
      mediaToDelete.map(async (mediaItem) => {
        if (
          !mediaItem.key ||
          mediaItem.provider === "late" ||
          mediaItem.provider === "URL_ONLY"
        ) {
          return;
        }

        const storage = mediaItem.provider
          ? getStorageByProvider(mediaItem.provider) ?? defaultStorage
          : defaultStorage;
        if (!storage) {
          return;
        }

        try {
          await storage.delete(mediaItem.key);
        } catch (error) {
          console.error(
            `Failed to delete media "${mediaItem.id}" from storage:`,
            error,
          );
        }
      }),
    );

    await prisma.post.delete({ where: { id: postId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/posts/[postId] error");
  }
}
