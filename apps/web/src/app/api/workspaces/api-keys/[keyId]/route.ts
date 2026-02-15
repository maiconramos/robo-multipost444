import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { hasWorkspaceRole } from "@/lib/auth/workspace";
import { handleApiError } from "@/lib/api/errors";
import { revokeApiKey } from "@/lib/api-keys";

type RouteContext = {
  params: Promise<{ keyId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { keyId } = await context.params;
    const { workspace, user } = await getWorkspaceUser(request.headers);

    // Only OWNER and ADMIN can revoke API keys
    const isAllowed = await hasWorkspaceRole(user.id, workspace.id, [
      "OWNER",
      "ADMIN",
    ]);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Only workspace owners and admins can revoke API keys" },
        { status: 403 }
      );
    }

    await revokeApiKey(keyId, workspace.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(
      error,
      "DELETE /api/workspaces/api-keys/[keyId] error"
    );
  }
}
