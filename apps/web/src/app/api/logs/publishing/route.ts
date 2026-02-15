import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { handleApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

const allowedStatuses = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
] as const;

const logsQuerySchema = z.object({
  postId: z.string().trim().min(1).optional(),
  status: z.enum(allowedStatuses).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function parseOptionalDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("INVALID_DATE");
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);

    const query = logsQuerySchema.parse({
      postId: request.nextUrl.searchParams.get("postId") ?? undefined,
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
      ...(query.postId ? { id: query.postId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(dateFrom || dateTo
        ? {
            updatedAt: {
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
          cronJob: true,
          platformPosts: {
            include: {
              account: {
                select: {
                  id: true,
                  handle: true,
                  name: true,
                  platform: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      entries: posts.map((post) => ({
        post: {
          id: post.id,
          content: post.content ?? "",
          status: post.status,
          scheduledFor: post.scheduledFor?.toISOString(),
          publishedAt: post.publishedAt?.toISOString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        },
        cronJob: post.cronJob
          ? {
              id: post.cronJob.id,
              status: post.cronJob.status,
              attempts: post.cronJob.attempts,
              maxAttempts: post.cronJob.maxAttempts,
              scheduledAt: post.cronJob.scheduledAt.toISOString(),
              lastError: post.cronJob.lastError ?? undefined,
              lockedAt: post.cronJob.lockedAt?.toISOString(),
              completedAt: post.cronJob.completedAt?.toISOString(),
            }
          : null,
        platformPosts: post.platformPosts.map((platformPost) => ({
          id: platformPost.id,
          platform: platformPost.platform,
          providerIdentifier: platformPost.providerIdentifier,
          status: platformPost.status,
          accountId: platformPost.accountId,
          accountHandle: platformPost.account.handle,
          accountName: platformPost.account.name ?? undefined,
          platformPostId: platformPost.platformPostId ?? undefined,
          platformPostUrl: platformPost.platformPostUrl ?? undefined,
          errorMessage: platformPost.errorMessage ?? undefined,
          publishedAt: platformPost.publishedAt?.toISOString(),
        })),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json(
        { error: "Invalid date format in dateFrom/dateTo" },
        { status: 400 },
      );
    }

    return handleApiError(error, "GET /api/logs/publishing error");
  }
}
