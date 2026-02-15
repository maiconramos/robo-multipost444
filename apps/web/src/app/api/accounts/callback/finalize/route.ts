import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { BYOProvider } from "@/lib/providers/byo-provider";
import { serializeAccount } from "@/lib/api/serializers";

const editableRoles = ["OWNER", "ADMIN"];

const finalizeSchema = z.object({
  flowId: z.string().min(1),
  candidateId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { workspace, member } = await getWorkspaceUser(request.headers);
    if (!editableRoles.includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const body = finalizeSchema.parse(rawBody);

    const provider = new BYOProvider(workspace.id);
    const account = await provider.finalizeOAuthFlow(
      body.flowId,
      body.candidateId,
      workspace.id,
    );

    return NextResponse.json({
      type: "complete",
      account: serializeAccount(account),
      profileId: account.profileId,
      providerType: "byo",
      providerIdentifier: account.providerIdentifier,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    if (
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("expired") ||
        error.message.includes("selection"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("POST /api/accounts/callback/finalize error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to finalize callback",
      },
      { status: 500 },
    );
  }
}
