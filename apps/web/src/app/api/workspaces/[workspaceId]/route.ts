import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/get-current-user";
import { hasWorkspaceRole } from "@/lib/auth/workspace";

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

/**
 * PUT /api/workspaces/[workspaceId] - Rename workspace
 * Only OWNER can rename workspace.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { workspaceId } = await context.params;
    const session = await getAuthenticatedUser(request.headers);

    const canRename = await hasWorkspaceRole(session.user.id, workspaceId, ["OWNER"]);
    if (!canRename) {
      return NextResponse.json(
        { error: "Only workspace owners can rename workspace" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name } = updateWorkspaceSchema.parse(body);

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    console.error("PUT /api/workspaces/[workspaceId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
