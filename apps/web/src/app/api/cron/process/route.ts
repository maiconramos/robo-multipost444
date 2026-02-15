import { NextRequest, NextResponse } from "next/server";
import {
  countPendingJobsReady,
  processPendingJobs,
} from "@/lib/posts/publish-runner";
import { isValidCronSecret } from "@/lib/secrets";

export const maxDuration = 300;

function isCronAuthorized(request: NextRequest): boolean {
  if (request.headers.get("x-vercel-cron") === "1") {
    return true;
  }

  const headerSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;

  return isValidCronSecret(headerSecret);
}

export async function POST(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingJobs();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const runRequested =
    request.headers.get("x-vercel-cron") === "1" ||
    request.nextUrl.searchParams.get("run") === "1";

  if (runRequested) {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processPendingJobs();
    return NextResponse.json({
      mode: "processed",
      ...result,
    });
  }

  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pendingReadyJobs = await countPendingJobsReady();
  return NextResponse.json({
    mode: "health",
    pendingReadyJobs,
  });
}
