import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getWorkspaceUser } from "@/lib/auth/get-current-user";
import { WORKSPACE_COOKIE_NAME } from "@/lib/auth/workspace";

/**
 * GET /api/workspaces - List workspaces for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getWorkspaceUser(request.headers);

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      createdAt: m.workspace.createdAt,
    }));

    return NextResponse.json({
      workspaces,
      activeWorkspaceId: session.workspace.id,
      multiWorkspaceEnabled: process.env.ENABLE_MULTI_WORKSPACE === "true",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspaces - Create a new workspace
 * Only available when ENABLE_MULTI_WORKSPACE=true and user is OWNER of some workspace.
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.ENABLE_MULTI_WORKSPACE !== "true") {
      return NextResponse.json(
        { error: "Multi-workspace is not enabled" },
        { status: 403 }
      );
    }

    const session = await getAuthenticatedUser(request.headers);
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    // Check if user is OWNER of any workspace
    const ownerMembership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id, role: "OWNER" },
    });

    if (!ownerMembership) {
      return NextResponse.json(
        { error: "Only workspace owners can create new workspaces" },
        { status: 403 }
      );
    }

    const slug = `ws-${name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now()}`;

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    const response = NextResponse.json({ workspace }, { status: 201 });
    response.cookies.set({
      name: WORKSPACE_COOKIE_NAME,
      value: workspace.id,
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
    console.error("POST /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
