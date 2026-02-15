import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProfile } from "@/lib/api/serializers";
import {
  authenticatePublicApi,
  publicApiResponse,
} from "@/lib/api-keys/middleware";

export async function GET(request: NextRequest) {
  const authResult = await authenticatePublicApi(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { workspaceId } = authResult;

    const profiles = await prisma.profile.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });

    return publicApiResponse(
      { profiles: profiles.map(serializeProfile) },
      authResult
    );
  } catch (error) {
    console.error("GET /api/public/v1/profiles error:", error);
    return publicApiResponse(
      { error: "Internal server error" },
      authResult,
      { status: 500 }
    );
  }
}
