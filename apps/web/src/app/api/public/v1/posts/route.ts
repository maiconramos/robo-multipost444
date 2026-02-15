import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { serializePost } from "@/lib/api/serializers";
import { getNextAvailableSlot } from "@/lib/queue-scheduler";
import {
  authenticatePublicApi,
  publicApiResponse,
} from "@/lib/api-keys/middleware";
import {
  mediaItemSchema,
  platformPayloadSchema,
  validateAndNormalizePlatformPayloads,
} from "@/lib/posts/platform-settings-schema";
import { resolvePlatformSelections } from "@/lib/posts/platform-selection";
import { validateScheduledAt } from "@/lib/posts/scheduling";

const allowedStatuses = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;

const listPostsQuerySchema = z.object({
  profileId: z.string().trim().min(1).optional(),
  status: z.enum(allowedStatuses).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createPostSchema = z
  .object({
    content: z.string().max(5000).optional().default(""),
    profileId: z.string().trim().min(1).optional(),
    platforms: z.array(platformPayloadSchema).min(1),
    mediaItems: z.array(mediaItemSchema).optional().default([]),
    scheduledFor: z.string().datetime().optional(),
    timezone: z.string().optional(),
    queuedFromProfile: z.string().optional(),
  })
  .refine(
    (data) => data.content.trim().length > 0 || data.mediaItems.length > 0,
    "Post must include content or media"
  );

function parseOptionalDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
  return date;
}

export async function GET(request: NextRequest) {
  const authResult = await authenticatePublicApi(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { workspaceId } = authResult;

    const query = listPostsQuerySchema.parse({
      profileId:
        request.nextUrl.searchParams.get("profileId") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
      dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const dateFrom = parseOptionalDate(query.dateFrom);
    const dateTo = parseOptionalDate(query.dateTo);

    const where: Prisma.PostWhereInput = {
      workspaceId,
      ...(query.profileId ? { profileId: query.profileId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(dateFrom || dateTo
        ? {
            scheduledFor: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          mediaItems: true,
          platformPosts: true,
          cronJob: true,
        },
        orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.post.count({ where }),
    ]);

    return publicApiResponse(
      {
        posts: posts.map(serializePost),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      },
      authResult
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return publicApiResponse(
        { error: "Validation failed", issues: error.issues },
        authResult,
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return publicApiResponse(
        { error: "Invalid date format in dateFrom/dateTo" },
        authResult,
        { status: 400 }
      );
    }
    console.error("GET /api/public/v1/posts error:", error);
    return publicApiResponse(
      { error: "Internal server error" },
      authResult,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticatePublicApi(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { workspaceId } = authResult;
    const body = await request.json();
    const parsed = createPostSchema.parse(body);

    const selectionResult = await resolvePlatformSelections({
      db: prisma,
      workspaceId,
      platforms: parsed.platforms,
    });
    if (!selectionResult.ok) {
      return publicApiResponse(
        {
          error: selectionResult.error,
          issues: selectionResult.issues,
        },
        authResult,
        { status: 400 },
      );
    }

    if (parsed.profileId && parsed.profileId !== selectionResult.data.profileId) {
      return publicApiResponse(
        { error: "profileId does not match selected accounts profile" },
        authResult,
        { status: 400 },
      );
    }

    const normalizedPlatformsResult = validateAndNormalizePlatformPayloads({
      platforms: selectionResult.data.selections,
      mediaItems: parsed.mediaItems,
    });
    if (!normalizedPlatformsResult.ok) {
      return publicApiResponse(
        {
          error: normalizedPlatformsResult.error,
          issues: normalizedPlatformsResult.issues,
        },
        authResult,
        { status: 400 },
      );
    }

    const missingProviderIdentifierIndex = normalizedPlatformsResult.data.findIndex(
      (entry) => !entry.providerIdentifier,
    );
    if (missingProviderIdentifierIndex !== -1) {
      return publicApiResponse(
        {
          error: "Provider identifier is required for selected platform account.",
          issues: [
            {
              path: `platforms.${missingProviderIdentifierIndex}.providerIdentifier`,
              message: "Provider identifier is required for selected platform account.",
              accountId:
                normalizedPlatformsResult.data[missingProviderIdentifierIndex]?.accountId,
              platform:
                normalizedPlatformsResult.data[missingProviderIdentifierIndex]?.platform,
            },
          ],
        },
        authResult,
        { status: 400 },
      );
    }

    const profileId = selectionResult.data.profileId;

    let scheduledAt: Date | null = null;
    let queueId: string | null = null;

    if (parsed.scheduledFor) {
      scheduledAt = new Date(parsed.scheduledFor);
      const scheduleValidation = validateScheduledAt(scheduledAt);
      if (!scheduleValidation.ok) {
        return publicApiResponse(
          {
            error: scheduleValidation.message,
            minScheduledFor: scheduleValidation.minScheduledAt.toISOString(),
          },
          authResult,
          { status: 400 },
        );
      }
    } else if (parsed.queuedFromProfile) {
      const queue = await prisma.queue.findFirst({
        where: {
          workspaceId,
          profileId,
          active: true,
        },
        include: { slots: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

      if (!queue) {
        return publicApiResponse(
          { error: "No active queue found for selected profile" },
          authResult,
          { status: 400 }
        );
      }

      const nextQueueSlot = getNextAvailableSlot(
        queue.slots,
        queue.timezone
      );
      if (!nextQueueSlot) {
        return publicApiResponse(
          { error: "Queue has no available slots" },
          authResult,
          { status: 400 }
        );
      }

      scheduledAt = nextQueueSlot;
      queueId = queue.id;
    }

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          workspaceId,
          profileId,
          content:
            parsed.content.trim().length > 0 ? parsed.content : null,
          status: scheduledAt ? "scheduled" : "draft",
          scheduledFor: scheduledAt,
          timezone: parsed.timezone,
          queueId,
          socialAccountId: selectionResult.data.primaryAccountId,
          providerType: selectionResult.data.primaryProviderType,
          platformPosts: {
            create: normalizedPlatformsResult.data.map((platformEntry) => ({
              platform: platformEntry.platform,
              accountId: platformEntry.accountId,
              providerIdentifier: platformEntry.providerIdentifier as string,
              customContent: platformEntry.customContent,
              platformData:
                platformEntry.platformSpecificData as
                  | Prisma.InputJsonValue
                  | undefined,
              status: "pending",
            })),
          },
          mediaItems: {
            create: parsed.mediaItems.map((media) => ({
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
          },
        },
      });

      if (scheduledAt) {
        await tx.cronJob.create({
          data: {
            postId: created.id,
            scheduledAt,
            status: "pending",
          },
        });
      }

      const withRelations = await tx.post.findUnique({
        where: { id: created.id },
        include: {
          mediaItems: true,
          platformPosts: true,
          cronJob: true,
        },
      });

      if (!withRelations) throw new Error("NOT_FOUND");
      return withRelations;
    });

    return publicApiResponse(
      { post: serializePost(post) },
      authResult,
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return publicApiResponse(
        { error: "Validation failed", issues: error.issues },
        authResult,
        { status: 400 }
      );
    }
    console.error("POST /api/public/v1/posts error:", error);
    return publicApiResponse(
      { error: "Internal server error" },
      authResult,
      { status: 500 }
    );
  }
}
