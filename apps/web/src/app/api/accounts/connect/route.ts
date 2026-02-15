import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  getProvider,
  LateProvider,
  type ProviderType,
} from "@/lib/providers";
import {
  providerTypeFromEntry,
  resolveProviderFromPayload,
} from "@/lib/providers/catalog/account-provider";
import {
  addOAuthStateEntry,
  decodeOAuthStateCookie,
  encodeOAuthStateCookie,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_SECONDS,
} from "@/lib/providers/oauth-state";
import { PLATFORMS, type Platform } from "@/lib/platforms/types";
import { toSocialPlatform } from "@/lib/social-accounts";

interface ConnectBody {
  providerIdentifier?: string;
  platform?: string;
  profileId?: string;
  socialAccountId?: string;
  providerType?: ProviderType;
}

export async function POST(request: NextRequest) {
  return handleConnectRequest(request);
}

export async function handleConnectRequest(
  request: NextRequest,
  forcedPlatform?: string,
) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = (await request.json().catch(() => ({}))) as ConnectBody;

    const requestedPlatform = forcedPlatform || body.platform;
    const profileId = body.profileId;
    const socialAccountId = body.socialAccountId;

    if (!profileId || typeof profileId !== "string") {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const providerEntry = resolveProviderFromPayload({
      providerIdentifier: body.providerIdentifier,
      platform: requestedPlatform,
      providerType: body.providerType,
      onlyActive: true,
    });

    if (!providerEntry) {
      return NextResponse.json(
        { error: "Invalid provider selection" },
        { status: 400 },
      );
    }

    if (
      forcedPlatform &&
      providerEntry.platform !== forcedPlatform.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Provider/platform mismatch" },
        { status: 400 },
      );
    }

    if (
      providerEntry.connectMode !== "oauth" &&
      providerEntry.connectionMethod !== "LATE"
    ) {
      return NextResponse.json(
        { error: "Selected provider does not use OAuth connect flow" },
        { status: 400 },
      );
    }

    const platform = providerEntry.platform as Platform;
    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const existingProfile = await prisma.profile.findFirst({
      where: {
        id: profileId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });

    if (!existingProfile) {
      await prisma.profile.create({
        data: {
          id: profileId,
          workspaceId: workspace.id,
          name: `Profile ${profileId.slice(0, 8)}`,
        },
      });
    }

    const resolvedProviderType = providerTypeFromEntry(providerEntry);
    const provider = await getProvider(workspace.id, resolvedProviderType);
    const inferredProviderType: ProviderType =
      provider instanceof LateProvider ? "late" : "byo";

    if (providerEntry.connectionMethod === "BYO_OAUTH") {
      if (!socialAccountId || typeof socialAccountId !== "string") {
        return NextResponse.json(
          { error: "socialAccountId is required for BYO OAuth connection" },
          { status: 400 },
        );
      }

      const account = await prisma.socialAccount.findFirst({
        where: {
          id: socialAccountId,
          workspaceId: workspace.id,
          profileId,
          platform: toSocialPlatform(platform),
          connectionMethod: "BYO_OAUTH",
          providerIdentifier: providerEntry.identifier,
        },
        select: { id: true },
      });

      if (!account) {
        return NextResponse.json(
          { error: "BYO OAuth account not found for this profile/platform" },
          { status: 404 },
        );
      }
    }

    const redirectBase =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin;
    const redirectUrl = `${redirectBase.replace(/\/$/, "")}/callback`;
    const auth = await provider.getAuthUrl(
      platform,
      profileId,
      redirectUrl,
      workspace.id,
      {
        socialAccountId,
        providerIdentifier: providerEntry.identifier,
      },
    );

    const existingStates = decodeOAuthStateCookie(
      request.cookies.get(OAUTH_STATE_COOKIE)?.value,
    );
    const nextStates = addOAuthStateEntry(existingStates, {
      state: auth.state,
      platform,
      providerIdentifier: providerEntry.identifier,
      profileId,
      workspaceId: workspace.id,
      socialAccountId,
      providerType: inferredProviderType,
      redirectUrl,
      codeVerifier: auth.codeVerifier,
      createdAt: Date.now(),
    });

    const response = NextResponse.json({
      url: auth.url,
      state: auth.state,
      providerType: inferredProviderType,
      providerIdentifier: providerEntry.identifier,
    });

    response.cookies.set(OAUTH_STATE_COOKIE, encodeOAuthStateCookie(nextStates), {
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

    console.error("POST /api/accounts/connect error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize account connection",
      },
      { status: 500 },
    );
  }
}
