import { NextRequest } from "next/server";
import { handleConnectRequest } from "@/app/api/accounts/connect/route";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  const { platform } = await context.params;
  return handleConnectRequest(request, platform);
}
