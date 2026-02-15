import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { getProvider } from "@/lib/providers";
import { serializeAccount } from "@/lib/api/serializers";
import { resolveProviderTypeFromIdentifier } from "@/lib/providers/runtime/registry";
import {
  consumeOAuthStateEntry,
  decodeOAuthStateCookie,
  encodeOAuthStateCookie,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
} from "@/lib/providers/oauth-state";
import { PLATFORMS, type Platform } from "@/lib/platforms/types";

interface CallbackBody {
  platform?: string;
  code?: string;
  state?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = (await request.json().catch(() => ({}))) as CallbackBody;

    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json({ error: "Missing OAuth code" }, { status: 400 });
    }

    if (!body.state || typeof body.state !== "string") {
      return NextResponse.json({ error: "Missing OAuth state" }, { status: 400 });
    }

    const cookieEntries = decodeOAuthStateCookie(
      request.cookies.get(OAUTH_STATE_COOKIE)?.value,
    );
    const { entry, remaining } = consumeOAuthStateEntry(cookieEntries, body.state);

    if (!entry) {
      return NextResponse.json(
        { error: "OAuth state expired or invalid" },
        { status: 400 },
      );
    }

    if (entry.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "OAuth state does not belong to the current workspace" },
        { status: 403 },
      );
    }

    const requestedPlatform =
      typeof body.platform === "string" ? (body.platform as Platform) : undefined;
    if (requestedPlatform && requestedPlatform !== entry.platform) {
      return NextResponse.json(
        { error: "OAuth callback platform mismatch" },
        { status: 400 },
      );
    }

    const platform = entry.platform as Platform;
    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const providerType =
      resolveProviderTypeFromIdentifier(entry.providerIdentifier) ??
      entry.providerType;
    const provider = await getProvider(workspace.id, providerType);
    const result = await provider.handleCallback(
      platform,
      body.code,
      body.state,
      workspace.id,
      entry.profileId,
      {
        redirectUrl: entry.redirectUrl,
        codeVerifier: entry.codeVerifier,
        socialAccountId: entry.socialAccountId,
        providerIdentifier: entry.providerIdentifier,
      },
    );

    const payload =
      result.type === "complete"
        ? {
          ...result,
          providerIdentifier: entry.providerIdentifier,
          account: serializeAccount(result.account),
        }
        : {
          ...result,
          providerIdentifier: entry.providerIdentifier,
        };

    const response = NextResponse.json(payload);

    response.cookies.set(OAUTH_STATE_COOKIE, encodeOAuthStateCookie(remaining), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: OAUTH_STATE_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("POST /api/accounts/callback error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process callback",
      },
      { status: 500 },
    );
  }
}
