import { NextRequest, NextResponse } from "next/server";
import {
  authenticatePublicApi,
  publicApiResponse,
} from "@/lib/api-keys/middleware";

export async function POST(request: NextRequest) {
  const authResult = await authenticatePublicApi(request);
  if (authResult instanceof NextResponse) return authResult;

  return publicApiResponse(
    {
      error:
        "Legacy upload endpoint removed. Request upload token at /api/public/v1/media/token and upload directly to Blob.",
    },
    authResult,
    { status: 410 },
  );
}
