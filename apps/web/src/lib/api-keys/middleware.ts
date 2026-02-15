import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "./index";
import { checkRateLimit, maxRequests } from "./rate-limit";

type AuthSuccess = {
  workspaceId: string;
  rateLimitRemaining: number;
  rateLimitReset: number;
};

/**
 * Authenticate a public API request via X-API-Key header.
 * Returns the workspace context on success, or a NextResponse error.
 */
export async function authenticatePublicApi(
  request: NextRequest
): Promise<AuthSuccess | NextResponse> {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing X-API-Key header" },
      { status: 401 }
    );
  }

  const result = await validateApiKey(apiKey);
  if (!result) {
    return NextResponse.json(
      { error: "Invalid or expired API key" },
      { status: 401 }
    );
  }

  // Rate limit by key prefix
  const prefix = apiKey.slice(0, 12);
  const rateLimit = checkRateLimit(prefix);

  if (!rateLimit.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((rateLimit.resetAt * 1000 - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return {
    workspaceId: result.workspaceId,
    rateLimitRemaining: rateLimit.remaining,
    rateLimitReset: rateLimit.resetAt,
  };
}

/**
 * Create a JSON response with rate limit headers.
 */
export function publicApiResponse(
  body: unknown,
  auth: AuthSuccess,
  init?: { status?: number }
): NextResponse {
  const response = NextResponse.json(body, { status: init?.status ?? 200 });
  response.headers.set("X-RateLimit-Limit", String(maxRequests));
  response.headers.set(
    "X-RateLimit-Remaining",
    String(auth.rateLimitRemaining)
  );
  response.headers.set("X-RateLimit-Reset", String(auth.rateLimitReset));
  return response;
}
