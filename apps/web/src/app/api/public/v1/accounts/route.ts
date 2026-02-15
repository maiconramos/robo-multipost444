import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromSocialPlatform } from "@/lib/social-accounts";
import {
  authenticatePublicApi,
  publicApiResponse,
} from "@/lib/api-keys/middleware";

export async function GET(request: NextRequest) {
  const authResult = await authenticatePublicApi(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { workspaceId } = authResult;

    const accounts = await prisma.socialAccount.findMany({
      where: { workspaceId },
      select: {
        id: true,
        workspaceId: true,
        profileId: true,
        platform: true,
        connectionMethod: true,
        status: true,
        handle: true,
        name: true,
        username: true,
        displayName: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return publicApiResponse(
      {
        accounts: accounts.map((account) => ({
          id: account.id,
          profileId: account.profileId,
          platform: fromSocialPlatform(account.platform),
          connectionMethod: account.connectionMethod,
          status: account.status,
          handle: account.handle,
          name: account.name ?? undefined,
          username: account.username || account.handle,
          displayName: account.displayName ?? account.name ?? undefined,
          profilePicture: account.profilePicture ?? undefined,
          isActive: account.isActive,
          createdAt: account.createdAt.toISOString(),
          updatedAt: account.updatedAt.toISOString(),
        })),
      },
      authResult
    );
  } catch (error) {
    console.error("GET /api/public/v1/accounts error:", error);
    return publicApiResponse(
      { error: "Internal server error" },
      authResult,
      { status: 500 }
    );
  }
}
