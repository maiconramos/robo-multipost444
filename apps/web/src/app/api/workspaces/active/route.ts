import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  getWorkspaceUser,
} from "@/lib/auth/get-current-user";
import { WORKSPACE_COOKIE_NAME } from "@/lib/auth/workspace";

/**
 * GET /api/workspaces/active - Get active workspace for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    return NextResponse.json({ workspaceId: workspace.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }
    console.error("GET /api/workspaces/active error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/active - Set active workspace for current user
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser(request.headers);
    const body = await request.json().catch(() => ({}));
    const workspaceId =
      typeof body?.workspaceId === "string" ? body.workspaceId.trim() : "";

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
      select: { workspaceId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Workspace access denied" },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true, workspaceId });
    response.cookies.set({
      name: WORKSPACE_COOKIE_NAME,
      value: workspaceId,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT /api/workspaces/active error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
