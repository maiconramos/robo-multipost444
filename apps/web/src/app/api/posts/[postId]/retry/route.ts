import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import {
  serializePostMutationResponse,
  type PublishExecution,
} from "@/lib/api/serializers";
import { processPendingJobs } from "@/lib/posts/publish-runner";

export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const existing = await prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId: workspace.id,
      },
      include: {
        cronJob: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed posts can be retried" },
        { status: 400 }
      );
    }

    const now = new Date();

    let post = await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          status: "scheduled",
          scheduledFor: existing.scheduledFor ?? now,
          publishedAt: null,
        },
      });

      await tx.platformPost.updateMany({
        where: { postId },
        data: {
          status: "pending",
          platformPostId: null,
          platformPostUrl: null,
          errorMessage: null,
          publishedAt: null,
        },
      });

      if (existing.cronJob) {
        await tx.cronJob.update({
          where: { postId },
          data: {
            status: "pending",
            attempts: existing.cronJob.attempts + 1,
            scheduledAt: now,
            lastError: null,
            lockedAt: null,
            lockedBy: null,
            completedAt: null,
          },
        });
      } else {
        await tx.cronJob.create({
          data: {
            postId,
            scheduledAt: now,
            status: "pending",
            attempts: 1,
          },
        });
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

    let publishExecution: PublishExecution = "queued_for_cron";

    try {
      const runResult = await processPendingJobs({
        postId,
        batchSize: 1,
      });
      publishExecution = runResult.processedPostIds.includes(postId)
        ? "processed_now"
        : "queued_fallback";
    } catch (error) {
      console.error("Retry immediate execution failed:", error);
      publishExecution = "queued_fallback";
    }

    const latestPost = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        mediaItems: true,
        platformPosts: true,
        cronJob: true,
      },
    });

    if (latestPost) {
      post = latestPost;
    }

    return NextResponse.json(
      serializePostMutationResponse(post, publishExecution),
    );
  } catch (error) {
    return handleApiError(error, "POST /api/posts/[postId]/retry error");
  }
}
