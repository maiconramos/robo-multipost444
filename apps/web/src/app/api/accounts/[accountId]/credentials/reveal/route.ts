import { NextRequest, NextResponse } from "next/server";
import { CredentialKind } from "@prisma/client";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { decryptAccountSecret } from "@/lib/account-credentials";

const editableRoles = ["OWNER", "ADMIN"];

const revealSchema = z.object({
  kind: z.nativeEnum(CredentialKind),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { workspace, member } = await getWorkspaceUser(request.headers);
    if (!editableRoles.includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { accountId } = await context.params;
    const body = revealSchema.parse(await request.json().catch(() => ({})));

    const credential = await prisma.credential.findFirst({
      where: {
        workspaceId: workspace.id,
        socialAccountId: accountId,
        kind: body.kind,
      },
      select: {
        id: true,
        kind: true,
        encryptedValue: true,
      },
    });

    if (!credential || !credential.encryptedValue) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Revealing secrets is disabled for security. Refer to the masked preview." },
      { status: 403 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("POST /api/accounts/[accountId]/credentials/reveal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
