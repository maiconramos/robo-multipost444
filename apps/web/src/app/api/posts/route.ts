import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import {
  serializePost,
  serializePostMutationResponse,
  type PublishExecution,
} from "@/lib/api/serializers";
import { getNextAvailableSlot } from "@/lib/queue-scheduler";
import {
  mediaItemSchema,
  platformPayloadSchema,
  validateAndNormalizePlatformPayloads,
} from "@/lib/posts/platform-settings-schema";
import { resolvePlatformSelections } from "@/lib/posts/platform-selection";
import { processPendingJobs } from "@/lib/posts/publish-runner";
import { validateScheduledAt } from "@/lib/posts/scheduling";

export const maxDuration = 300;

const allowedStatuses = ["draft", "scheduled", "publishing", "published", "failed"] as const;

const listPostsQuerySchema = z.object({
  profileId: z.string().trim().min(1).optional(),
  status: z.enum(allowedStatuses).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(50),
});

const createPostSchema = z
  .object({
    content: z.string().max(5000).optional().default(""),
    platforms: z.array(platformPayloadSchema).min(1),
    mediaItems: z.array(mediaItemSchema).optional().default([]),
    scheduledFor: z.string().datetime().optional(),
    publishNow: z.boolean().optional(),
    timezone: z.string().optional(),
    queuedFromProfile: z.string().optional(),
    saveDraft: z.boolean().optional(),
  })
  .refine(
    (data) => data.content.trim().length > 0 || data.mediaItems.length > 0,
    "Post must include content or media"
  );

function parseOptionalDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_DATE");
  }

  return date;
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);

    const query = listPostsQuerySchema.parse({
      profileId: request.nextUrl.searchParams.get("profileId") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
      dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const dateFrom = parseOptionalDate(query.dateFrom);
    const dateTo = parseOptionalDate(query.dateTo);

    const where: Prisma.PostWhereInput = {
      workspaceId: workspace.id,
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

    return NextResponse.json({
      posts: posts.map(serializePost),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json(
        { error: "Invalid date format in dateFrom/dateTo" },
        { status: 400 }
      );
    }

    return handleApiError(error, "GET /api/posts error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json();
    const parsed = createPostSchema.parse(body);
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

    const normalizedPlatformsResult = validateAndNormalizePlatformPayloads({
      platforms: selectionResult.data.selections,
      mediaItems: parsed.mediaItems,
    });

    if (!normalizedPlatformsResult.ok) {
      return NextResponse.json(
        {
          error: normalizedPlatformsResult.error,
          issues: normalizedPlatformsResult.issues,
        },
        { status: 400 },
      );
    }

    const missingProviderIdentifierIndex = normalizedPlatformsResult.data.findIndex(
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
              accountId:
                normalizedPlatformsResult.data[missingProviderIdentifierIndex]?.accountId,
              platform:
                normalizedPlatformsResult.data[missingProviderIdentifierIndex]?.platform,
            },
          ],
        },
        { status: 400 },
      );
    }

    const profileId = selectionResult.data.profileId;

    let scheduledAt: Date | null = null;
    let queueId: string | null = null;
    const isDraft = parsed.saveDraft === true;

    if (isDraft) {
      // Drafts store the planned date but don't create a CronJob.
      // The date is optional (user may set it later).
      if (parsed.scheduledFor) {
        const draftDate = new Date(parsed.scheduledFor);
        const scheduleValidation = validateScheduledAt(draftDate);
        if (!scheduleValidation.ok) {
          return NextResponse.json(
            {
              error: scheduleValidation.message,
              minScheduledFor: scheduleValidation.minScheduledAt.toISOString(),
            },
            { status: 400 },
          );
        }
        // Store scheduledFor for display but keep status as "draft"
        scheduledAt = draftDate;
      }
    } else if (parsed.publishNow) {
      scheduledAt = new Date();
    } else if (parsed.scheduledFor) {
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
    } else if (parsed.queuedFromProfile) {
      if (parsed.queuedFromProfile !== profileId) {
        return NextResponse.json(
          { error: "Queue profile does not match selected accounts profile" },
          { status: 400 }
        );
      }

      const queue = await prisma.queue.findFirst({
        where: {
          workspaceId: workspace.id,
          profileId,
          active: true,
        },
        include: {
          slots: true,
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

      if (!queue) {
        return NextResponse.json(
          { error: "No active queue found for selected profile" },
          { status: 400 }
        );
      }

      const nextQueueSlot = getNextAvailableSlot(queue.slots, queue.timezone);
      if (!nextQueueSlot) {
        return NextResponse.json(
          { error: "Queue has no available slots" },
          { status: 400 }
        );
      }

      scheduledAt = nextQueueSlot;
      queueId = queue.id;
    }

    let post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          workspaceId: workspace.id,
          profileId,
          content: parsed.content.trim().length > 0 ? parsed.content : null,
          status: isDraft ? "draft" : scheduledAt ? "scheduled" : "draft",
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

      if (scheduledAt && !isDraft) {
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

      if (!withRelations) {
        throw new Error("NOT_FOUND");
      }

      return withRelations;
    });

    let publishExecution: PublishExecution = "queued_for_cron";

    if (parsed.publishNow) {
      try {
        const runResult = await processPendingJobs({
          postId: post.id,
          batchSize: 1,
        });

        publishExecution = runResult.processedPostIds.includes(post.id)
          ? "processed_now"
          : "queued_fallback";
      } catch (error) {
        console.error("Immediate publish execution failed:", error);
        publishExecution = "queued_fallback";
      }

      const latestPost = await prisma.post.findUnique({
        where: { id: post.id },
        include: {
          mediaItems: true,
          platformPosts: true,
          cronJob: true,
        },
      });

      if (latestPost) {
        post = latestPost;
      }
    }

    return NextResponse.json(
      serializePostMutationResponse(post, publishExecution),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "POST /api/posts error");
  }
}
