import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { getAIAvailability } from "@/lib/ai";
import { handleApiError } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const availability = await getAIAvailability(workspace.id);

    return NextResponse.json(availability);
  } catch (error) {
    return handleApiError(error, "GET /api/ai/status error");
  }
}
