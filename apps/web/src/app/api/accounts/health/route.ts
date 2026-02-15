import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import type { CredentialKind } from "@prisma/client";

function requiredCredentialKindForConnectionMethod(
  connectionMethod: "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE",
): CredentialKind {
  if (connectionMethod === "LATE") {
    return "LATE_API_KEY";
  }
  if (connectionMethod === "BYO_SYSTEM_USER") {
    return "SYSTEM_USER_TOKEN";
  }
  return "ACCESS_TOKEN";
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId") || undefined;

    const accounts = await prisma.socialAccount.findMany({
      where: {
        workspaceId: workspace.id,
        ...(profileId ? { profileId } : {}),
      },
      include: {
        credentials: {
          select: {
            kind: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const healthResults = await Promise.all(
      accounts.map(async (account) => {
        if (account.status !== "CONNECTED") {
          return {
            accountId: account.id,
            isHealthy: false,
            status: "inactive",
            error: "Account is not connected",
          };
        }

        const requiredKind = requiredCredentialKindForConnectionMethod(
          account.connectionMethod,
        );
        const credential = account.credentials.find(
          (entry) => entry.kind === requiredKind,
        );

        if (!credential) {
          return {
            accountId: account.id,
            isHealthy: false,
            status: "unhealthy",
            error: `Missing credential ${requiredKind}`,
          };
        }

        const isExpired = !!credential.expiresAt && credential.expiresAt <= new Date();
        return {
          accountId: account.id,
          isHealthy: !isExpired,
          status: isExpired ? "needs_reconnect" : "healthy",
          error: isExpired ? `Credential ${requiredKind} expired` : undefined,
        };
      }),
    );

    return NextResponse.json({
      accounts: healthResults,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("GET /api/accounts/health error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
