import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { serializePost } from "@/lib/api/serializers";
import { validateScheduledAt } from "@/lib/posts/scheduling";

const approvePostSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
});

type RouteContext = {
  params: Promise<{ postId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { postId } = await context.params;
    const { workspace, member } = await getWorkspaceUser(request.headers);

    if (!["OWNER", "ADMIN"].includes(member.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can approve draft posts" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = approvePostSchema.parse(body);

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

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft posts can be approved" },
        { status: 400 },
      );
    }

    // Use provided scheduledFor, or fall back to the existing one on the draft.
    let scheduledAt: Date;
    if (parsed.scheduledFor) {
      scheduledAt = new Date(parsed.scheduledFor);
    } else if (existing.scheduledFor) {
      scheduledAt = existing.scheduledFor;
    } else {
      return NextResponse.json(
        { error: "A scheduled date is required to approve a draft post" },
        { status: 400 },
      );
    }

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

    const post = await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          status: "scheduled",
          scheduledFor: scheduledAt,
        },
      });

      if (existing.cronJob) {
        await tx.cronJob.update({
          where: { postId },
          data: {
            scheduledAt,
            status: "pending",
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
            scheduledAt,
            status: "pending",
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

    return NextResponse.json({ post: serializePost(post) });
  } catch (error) {
    return handleApiError(error, "POST /api/posts/[postId]/approve error");
  }
}
