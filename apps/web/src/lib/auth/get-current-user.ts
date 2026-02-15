import { auth } from "@/lib/auth";
import {
  ensureWorkspace,
  getRequestedWorkspaceId,
  getWorkspaceForUser,
} from "./workspace";

/**
 * Get the current authenticated user from request headers.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  return session;
}

/**
 * Get the authenticated user or throw.
 * Use in API routes that require authentication.
 */
export async function getAuthenticatedUser(headers: Headers) {
  const session = await getCurrentUser(headers);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Get the authenticated user with their workspace context.
 * Ensures the user has a workspace (auto-creates for first user).
 * Use in API routes that require workspace-scoped access.
 */
export async function getWorkspaceUser(headers: Headers) {
  const session = await getAuthenticatedUser(headers);
  const { workspace, member } = await requireWorkspace(session.user.id, headers);
  return { ...session, workspace, member };
}

/**
 * Require workspace membership or throw.
 */
async function requireWorkspace(userId: string, headers: Headers) {
  const requestedWorkspaceId = getRequestedWorkspaceId(headers);
  let result = await getWorkspaceForUser(userId, requestedWorkspaceId);

  if (!result) {
    // Attempt to create a default workspace
    await ensureWorkspace(userId);
    // Fetch again
    result = await getWorkspaceForUser(userId, requestedWorkspaceId);
  }

  if (!result) {
    throw new Error("NO_WORKSPACE");
  }
  return result;
}
