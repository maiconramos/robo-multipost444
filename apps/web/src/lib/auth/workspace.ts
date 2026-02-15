import { prisma } from "@/lib/prisma";

export const WORKSPACE_COOKIE_NAME = "workspace-id";

/**
 * Ensure a user has at least one workspace.
 * If the user has no workspace memberships, auto-create a "Default" workspace
 * and assign them as OWNER.
 *
 * Returns the workspace ID.
 */
export async function ensureWorkspace(userId: string): Promise<string> {
  // Check for existing membership
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });

  if (existing) {
    return existing.workspaceId;
  }

  // Auto-create workspace for first-time user
  const workspace = await prisma.workspace.create({
    data: {
      name: "Default",
      slug: `ws-${userId.slice(0, 8)}-${Date.now()}`,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  });

  return workspace.id;
}

function getCookieValue(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === cookieName) {
      const value = valueParts.join("=");
      if (!value) return null;

      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return null;
}

export function getRequestedWorkspaceId(headers: Headers): string | null {
  const headerWorkspaceId = headers.get("x-workspace-id")?.trim();
  if (headerWorkspaceId) {
    return headerWorkspaceId;
  }

  return getCookieValue(headers.get("cookie"), WORKSPACE_COOKIE_NAME);
}

function toWorkspaceResult(member: {
  id: string;
  role: string;
  workspaceId: string;
  userId: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
}) {
  return {
    workspace: member.workspace,
    member: {
      id: member.id,
      role: member.role,
      workspaceId: member.workspaceId,
      userId: member.userId,
    },
  };
}

/**
 * Get the user's active workspace with membership info.
 * Returns null if the user has no workspace.
 *
 * For single-workspace mode (ENABLE_MULTI_WORKSPACE=false),
 * returns the first workspace.
 */
export async function getWorkspaceForUser(
  userId: string,
  requestedWorkspaceId?: string | null
) {
  if (requestedWorkspaceId) {
    const selectedMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: requestedWorkspaceId,
          userId,
        },
      },
      include: { workspace: true },
    });

    if (selectedMember) {
      return toWorkspaceResult(selectedMember);
    }
  }

  const firstMember = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (!firstMember) return null;

  return toWorkspaceResult(firstMember);
}

/**
 * Check if a user has a specific role in a workspace.
 */
export async function hasWorkspaceRole(
  userId: string,
  workspaceId: string,
  roles: string[]
): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });

  if (!member) return false;
  return roles.includes(member.role);
}
