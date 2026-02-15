import { randomBytes } from "crypto";
import type { Prisma, SocialAccount } from "@prisma/client";
import { encryptAccountSecret } from "@/lib/account-credentials";
import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { toProviderIdentifier } from "@/lib/providers/catalog";
import { getPlatformProvider } from "@/lib/providers/byo/registry";
import { OAUTH_STATE_TTL_SECONDS } from "@/lib/providers/oauth-state";
import type {
  AuthUrlResult,
  OAuthAuthUrlOptions,
  OAuthCandidateInternal,
  OAuthCandidatePublic,
  PostingProvider,
  ProviderCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  PublishResult,
  TokenData,
  PlatformOAuthResultComplete,
} from "@/lib/providers/types";
import type { Platform } from "@/lib/platforms/types";
import { fromSocialPlatform, toSocialPlatform } from "@/lib/social-accounts";
import { getBaseUrl } from "@/lib/secrets";

interface SerializedTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  metadata?: Record<string, unknown>;
}

interface PendingOAuthContextPayload {
  tokenData: SerializedTokenData;
  candidates: OAuthCandidateInternal[];
}

function serializeTokenData(tokenData: TokenData): SerializedTokenData {
  return {
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt: tokenData.expiresAt?.toISOString(),
    scope: tokenData.scope,
    metadata: tokenData.metadata,
  };
}

function deserializeTokenData(tokenData: SerializedTokenData): TokenData {
  return {
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt: tokenData.expiresAt ? new Date(tokenData.expiresAt) : undefined,
    scope: tokenData.scope,
    metadata: tokenData.metadata,
  };
}

function toPublicCandidate(candidate: OAuthCandidateInternal): OAuthCandidatePublic {
  return {
    id: candidate.id,
    name: candidate.name,
    ...(candidate.username ? { username: candidate.username } : {}),
    ...(candidate.profilePicture ? { profilePicture: candidate.profilePicture } : {}),
    ...(candidate.description ? { description: candidate.description } : {}),
  };
}

export class BYOProvider implements PostingProvider {
  constructor(private readonly workspaceId: string) { }

  async publishPost(
    post: ProviderPost,
    platformPost: ProviderPlatformPost,
  ): Promise<PublishResult> {
    await this.hydrateAccountCredentials(platformPost.account);

    const platform = platformPost.account.platform.toLowerCase() as Platform;
    const provider = getPlatformProvider(this.workspaceId, platform);

    if (platformPost.account.tokenExpiresAt && platformPost.account.tokenExpiresAt <= new Date()) {
      await this.refreshToken(platformPost.account);
      await this.hydrateAccountCredentials(platformPost.account);
    }

    return provider.publishPost(post, platformPost);
  }

  async getAuthUrl(
    platform: Platform,
    profileId: string,
    redirectUrl: string,
    workspaceId: string,
    options?: OAuthAuthUrlOptions,
  ): Promise<AuthUrlResult> {
    if (workspaceId !== this.workspaceId) {
      throw new Error("Workspace mismatch");
    }

    const socialAccountId = options?.socialAccountId;
    if (!socialAccountId) {
      throw new Error("BYO OAuth requires socialAccountId");
    }

    await this.assertOAuthAccountOwnership({
      socialAccountId,
      platform,
      profileId,
      workspaceId,
      providerIdentifier: options?.providerIdentifier,
    });

    const provider = getPlatformProvider(this.workspaceId, platform);
    const state = randomBytes(18).toString("base64url");

    const result = await provider.generateAuthUrl({
      state,
      profileId,
      redirectUrl,
      socialAccountId,
    });

    return {
      ...result,
      state,
    };
  }

  async handleCallback(
    platform: Platform,
    code: string,
    state: string,
    workspaceId: string,
    profileId: string,
    options?: {
      redirectUrl?: string;
      codeVerifier?: string;
      socialAccountId?: string;
      providerIdentifier?: string;
    },
  ): Promise<ProviderCallbackResult> {
    if (workspaceId !== this.workspaceId) {
      throw new Error("Workspace mismatch");
    }

    const socialAccountId = options?.socialAccountId;
    if (!socialAccountId) {
      throw new Error("BYO OAuth callback requires socialAccountId");
    }

    await this.assertOAuthAccountOwnership({
      socialAccountId,
      platform,
      profileId,
      workspaceId,
      providerIdentifier: options?.providerIdentifier,
    });

    const provider = getPlatformProvider(this.workspaceId, platform);
    const baseUrl = getBaseUrl();
    const result = await provider.handleCallback({
      code,
      state,
      profileId,
      redirectUrl: options?.redirectUrl || `${baseUrl}/callback`,
      codeVerifier: options?.codeVerifier,
      socialAccountId,
    });

    if (!result.isBetweenSteps) {
      const account = await this.persistConnectedAccount({
        socialAccountId,
        workspaceId,
        profileId,
        platform,
        result,
      });

      return {
        type: "complete",
        account,
        profileId,
        providerType: "byo",
      };
    }

    const publicCandidates = result.candidates.map(toPublicCandidate);

    const flow = await prisma.oAuthFlow.create({
      data: {
        workspaceId,
        socialAccountId,
        profileId,
        platform: toSocialPlatform(platform),
        status: "AWAITING_SELECTION",
        publicCandidates: publicCandidates as unknown as Prisma.InputJsonValue,
        contextEnc: encrypt(JSON.stringify({
          tokenData: serializeTokenData(result.tokenData),
          candidates: result.candidates,
        } satisfies PendingOAuthContextPayload)),
        expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_SECONDS * 1000),
      },
      select: {
        id: true,
      },
    });

    return {
      type: "pending",
      flowId: flow.id,
      platform,
      profileId,
      providerType: "byo",
      candidates: publicCandidates,
    };
  }

  async finalizeOAuthFlow(
    flowId: string,
    candidateId: string,
    workspaceId: string,
  ): Promise<SocialAccount> {
    if (workspaceId !== this.workspaceId) {
      throw new Error("Workspace mismatch");
    }

    const flow = await prisma.oAuthFlow.findFirst({
      where: {
        id: flowId,
        workspaceId,
        status: "AWAITING_SELECTION",
      },
    });

    if (!flow) {
      throw new Error("OAuth flow not found or already completed");
    }

    if (flow.expiresAt <= new Date()) {
      await prisma.oAuthFlow.update({
        where: { id: flow.id },
        data: {
          status: "EXPIRED",
          errorMessage: "OAuth flow expired before selection",
        },
      });
      throw new Error("OAuth flow expired");
    }

    const platform = fromSocialPlatform(flow.platform);
    const provider = getPlatformProvider(workspaceId, platform);
    if (!provider.finalizeSelection) {
      throw new Error(`Provider '${platform}' does not support multi-step OAuth selection`);
    }

    let context: PendingOAuthContextPayload;
    try {
      const decoded = JSON.parse(decrypt(flow.contextEnc)) as PendingOAuthContextPayload;
      if (!Array.isArray(decoded.candidates)) {
        throw new Error("Invalid OAuth flow context");
      }
      context = decoded;
    } catch {
      await prisma.oAuthFlow.update({
        where: { id: flow.id },
        data: {
          status: "FAILED",
          errorMessage: "Invalid OAuth flow context payload",
        },
      });
      throw new Error("Invalid OAuth flow context");
    }

    const candidate = context.candidates.find((entry) => entry.id === candidateId);
    if (!candidate) {
      throw new Error("Selected candidate was not found");
    }

    try {
      const finalized = await provider.finalizeSelection(
        deserializeTokenData(context.tokenData),
        candidate,
      );

      const account = await this.persistConnectedAccount({
        socialAccountId: flow.socialAccountId,
        workspaceId,
        profileId: flow.profileId,
        platform,
        result: finalized,
      });

      await prisma.oAuthFlow.update({
        where: { id: flow.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          errorMessage: null,
        },
      });

      return account;
    } catch (error) {
      await prisma.oAuthFlow.update({
        where: { id: flow.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "OAuth finalize failed",
        },
      });
      throw error;
    }
  }

  async refreshToken(account: SocialAccount): Promise<TokenData> {
    await this.hydrateAccountCredentials(account);

    const platform = account.platform.toLowerCase() as Platform;
    const provider = getPlatformProvider(this.workspaceId, platform);
    const tokenData = await provider.refreshToken(account);

    await prisma.$transaction(async (tx) => {
      await this.persistTokenData(tx, account.id, tokenData);
      await tx.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEnc: encrypt(tokenData.accessToken),
          refreshTokenEnc: tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null,
          tokenExpiresAt: tokenData.expiresAt ?? null,
        },
      });
    });

    return tokenData;
  }

  async validateConnection(account: SocialAccount): Promise<boolean> {
    await this.hydrateAccountCredentials(account);

    const platform = account.platform.toLowerCase() as Platform;
    const provider = getPlatformProvider(this.workspaceId, platform);
    return provider.validateConnection(account);
  }

  private async assertOAuthAccountOwnership(params: {
    socialAccountId: string;
    workspaceId: string;
    profileId: string;
    platform: Platform;
    providerIdentifier?: string;
  }): Promise<SocialAccount> {
    const account = await prisma.socialAccount.findFirst({
      where: {
        id: params.socialAccountId,
        workspaceId: params.workspaceId,
        profileId: params.profileId,
        platform: toSocialPlatform(params.platform),
        connectionMethod: "BYO_OAUTH",
        ...(params.providerIdentifier
          ? { providerIdentifier: params.providerIdentifier }
          : {}),
      },
    });

    if (!account) {
      throw new Error("BYO OAuth account not found for this workspace/profile/platform");
    }

    return account;
  }

  private async persistConnectedAccount(params: {
    socialAccountId: string;
    workspaceId: string;
    profileId: string;
    platform: Platform;
    result: PlatformOAuthResultComplete;
  }): Promise<SocialAccount> {
    const metadata = params.result.profile.oauthMetadata ?? params.result.tokenData.metadata ?? null;

    return prisma.$transaction(async (tx) => {
      const account = await tx.socialAccount.findFirst({
        where: {
          id: params.socialAccountId,
          workspaceId: params.workspaceId,
          profileId: params.profileId,
          platform: toSocialPlatform(params.platform),
          connectionMethod: "BYO_OAUTH",
        },
      });

      if (!account) {
        throw new Error("Social account not found for OAuth finalize");
      }

      await this.persistTokenData(tx, account.id, params.result.tokenData);

      return tx.socialAccount.update({
        where: { id: account.id },
        data: {
          status: "CONNECTED",
          providerIdentifier: toProviderIdentifier(
            "BYO_OAUTH",
            params.platform,
          ),
          handle: params.result.profile.username,
          name: params.result.profile.displayName ?? params.result.profile.username,
          providerType: "byo",
          platformUserId: params.result.profile.platformUserId ?? account.platformUserId,
          username: params.result.profile.username,
          displayName: params.result.profile.displayName,
          profilePicture: params.result.profile.profilePicture,
          oauthMetadata: metadata as Prisma.InputJsonValue,
          meta: metadata as Prisma.InputJsonValue,
          isActive: true,
          accessTokenEnc: encrypt(params.result.tokenData.accessToken),
          refreshTokenEnc: params.result.tokenData.refreshToken
            ? encrypt(params.result.tokenData.refreshToken)
            : null,
          tokenExpiresAt: params.result.tokenData.expiresAt ?? null,
        },
      });
    });
  }

  private async persistTokenData(
    tx: Prisma.TransactionClient,
    accountId: string,
    tokenData: TokenData,
  ): Promise<void> {
    const accessToken = encryptAccountSecret(tokenData.accessToken);
    await tx.credential.upsert({
      where: {
        socialAccountId_kind: {
          socialAccountId: accountId,
          kind: "ACCESS_TOKEN",
        },
      },
      update: {
        encryptedValue: accessToken.encryptedValue,
        last4: accessToken.last4,
        expiresAt: tokenData.expiresAt ?? null,
      },
      create: {
        workspaceId: this.workspaceId,
        socialAccountId: accountId,
        kind: "ACCESS_TOKEN",
        encryptedValue: accessToken.encryptedValue,
        last4: accessToken.last4,
        expiresAt: tokenData.expiresAt ?? null,
      },
    });

    if (tokenData.refreshToken) {
      const refreshToken = encryptAccountSecret(tokenData.refreshToken);
      await tx.credential.upsert({
        where: {
          socialAccountId_kind: {
            socialAccountId: accountId,
            kind: "REFRESH_TOKEN",
          },
        },
        update: {
          encryptedValue: refreshToken.encryptedValue,
          last4: refreshToken.last4,
        },
        create: {
          workspaceId: this.workspaceId,
          socialAccountId: accountId,
          kind: "REFRESH_TOKEN",
          encryptedValue: refreshToken.encryptedValue,
          last4: refreshToken.last4,
        },
      });
    } else {
      await tx.credential.deleteMany({
        where: {
          workspaceId: this.workspaceId,
          socialAccountId: accountId,
          kind: "REFRESH_TOKEN",
        },
      });
    }
  }

  private async hydrateAccountCredentials(account: SocialAccount): Promise<void> {
    const credentials = await prisma.credential.findMany({
      where: {
        workspaceId: this.workspaceId,
        socialAccountId: account.id,
        kind: {
          in: ["ACCESS_TOKEN", "REFRESH_TOKEN", "SYSTEM_USER_TOKEN"],
        },
      },
      select: {
        kind: true,
        encryptedValue: true,
        expiresAt: true,
      },
    });

    const accessToken =
      credentials.find((entry) => entry.kind === "ACCESS_TOKEN" && entry.encryptedValue) ??
      credentials.find((entry) => entry.kind === "SYSTEM_USER_TOKEN" && entry.encryptedValue);
    const refreshToken = credentials.find(
      (entry) => entry.kind === "REFRESH_TOKEN" && entry.encryptedValue,
    );

    if (accessToken?.encryptedValue) {
      account.accessTokenEnc = accessToken.encryptedValue;
      account.tokenExpiresAt = accessToken.expiresAt ?? null;
    } else {
      account.accessTokenEnc = null;
      account.tokenExpiresAt = null;
    }

    account.refreshTokenEnc = refreshToken?.encryptedValue ?? null;

    if (account.meta && typeof account.meta === "object" && !Array.isArray(account.meta)) {
      account.oauthMetadata = account.meta;
    }

    if (
      !account.platformUserId &&
      account.meta &&
      typeof account.meta === "object" &&
      !Array.isArray(account.meta)
    ) {
      const metadata = account.meta as Record<string, unknown>;
      const candidate =
        (typeof metadata.igUserId === "string" && metadata.igUserId) ||
        (typeof metadata.pageId === "string" && metadata.pageId) ||
        (typeof metadata.userId === "string" && metadata.userId) ||
        (typeof metadata.tiktokUserId === "string" && metadata.tiktokUserId);
      if (candidate) {
        account.platformUserId = candidate;
      }
    }

    if (!account.accessTokenEnc && account.connectionMethod !== "LATE") {
      throw new Error(
        `Missing account credential for ${account.connectionMethod} (${account.id})`,
      );
    }
  }
}
