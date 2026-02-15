import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/get-current-user";
import { hasWorkspaceRole } from "@/lib/auth/workspace";

/**
 * POST /api/workspaces/invite - Create an invitation
 * Only OWNER or ADMIN can invite.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser(request.headers);
    const body = await request.json();
    const { workspaceId, email } = body;

    if (!workspaceId || !email) {
      return NextResponse.json(
        { error: "workspaceId and email are required" },
        { status: 400 }
      );
    }

    // Check that the user is OWNER or ADMIN
    const canInvite = await hasWorkspaceRole(session.user.id, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);
    if (!canInvite) {
      return NextResponse.json(
        { error: "Only owners and admins can invite users" },
        { status: 403 }
      );
    }

    // Check if email is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this workspace" },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        workspaceId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email" },
        { status: 409 }
      );
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.invite.create({
      data: {
        workspaceId,
        email,
        token,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          token: invite.token,
          expiresAt: invite.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/workspaces/invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workspaces/invite - Accept an invitation
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser(request.headers);
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Invite token is required" },
        { status: 400 }
      );
    }

    const invite = await prisma.invite.findUnique({ where: { token } });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 404 }
      );
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 410 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check email matches
    if (invite.email !== session.user.email) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      // Mark invite as accepted and return success
      await prisma.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return NextResponse.json({ success: true, workspaceId: invite.workspaceId });
    }

    // Create membership and mark invite as accepted
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: session.user.id,
          role: "MEMBER",
        },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true, workspaceId: invite.workspaceId });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PUT /api/workspaces/invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workspaces/invite - Revoke an invitation
 * Only OWNER or ADMIN can revoke.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthenticatedUser(request.headers);
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID is required" },
        { status: 400 }
      );
    }

    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const canRevoke = await hasWorkspaceRole(
      session.user.id,
      invite.workspaceId,
      ["OWNER", "ADMIN"]
    );

    if (!canRevoke) {
      return NextResponse.json(
        { error: "Only owners and admins can revoke invitations" },
        { status: 403 }
      );
    }

    await prisma.invite.delete({ where: { id: inviteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("DELETE /api/workspaces/invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
