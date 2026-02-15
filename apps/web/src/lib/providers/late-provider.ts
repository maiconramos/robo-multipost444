import type { Prisma, SocialAccount } from "@prisma/client";
import { createLateClient } from "@/lib/late-api/client";
import type {
  AuthUrlResult,
  OAuthAuthUrlOptions,
  PostingProvider,
  ProviderCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  PublishResult,
  TokenData,
} from "@/lib/providers/types";
import type { Platform } from "@/lib/platforms/types";
import { prisma } from "@/lib/prisma";
import { toProviderIdentifier } from "@/lib/providers/catalog";
import { toSocialPlatform } from "@/lib/social-accounts";

export class LateProvider implements PostingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly workspaceId?: string,
  ) {}

  async publishPost(
    post: ProviderPost,
    platformPost: ProviderPlatformPost,
  ): Promise<PublishResult> {
    try {
      const late = createLateClient(this.apiKey);
      const payload = {
        profileId: post.profileId,
        content: platformPost.customContent ?? post.content ?? "",
        mediaItems: post.mediaItems.map((item) => ({
          type: item.type,
          url: item.url,
          width: item.width ?? undefined,
          height: item.height ?? undefined,
          duration: item.duration ?? undefined,
        })),
        platforms: [
          {
            platform: platformPost.platform,
            accountId:
              platformPost.account.lateAccountId ??
              platformPost.account.platformUserId ??
              platformPost.account.id,
            customContent: platformPost.customContent ?? undefined,
            platformSpecificData: platformPost.platformData ?? undefined,
          },
        ],
        publishNow: true,
      };

      const response = await (late.posts.createPost as any)({ body: payload });
      const data = response?.data ?? response;

      return {
        success: true,
        platformPostId:
          data?.post?._id ??
          data?._id ??
          data?.id ??
          undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish via Late",
      };
    }
  }

  async getAuthUrl(
    platform: Platform,
    profileId: string,
    redirectUrl: string,
    _workspaceId: string,
    _options?: OAuthAuthUrlOptions,
  ): Promise<AuthUrlResult> {
    const late = createLateClient(this.apiKey);
    const response = await (late.connect.getConnectUrl as any)({
      path: { platform },
      query: {
        profileId,
        redirect_url: redirectUrl,
        headless: true,
      },
    });

    const data = response?.data ?? response;
    const authUrl = data?.authUrl ?? data?.url;
    const state = data?.state ?? "late";

    if (!authUrl) {
      throw new Error("Late did not return an authorization URL");
    }

    return {
      url: authUrl,
      state,
      codeVerifier: data?.codeVerifier,
    };
  }

  async handleCallback(
    platform: Platform,
    code: string,
    _state: string,
    workspaceId: string,
    profileId: string,
  ): Promise<ProviderCallbackResult> {
    const lateAccountId = code;
    const username = `${platform}-${code.slice(0, 10)}`;

    const existing = await prisma.socialAccount.findFirst({
      where: {
        workspaceId,
        profileId,
        platform: toSocialPlatform(platform),
        connectionMethod: "LATE",
        lateAccountId,
      },
    });

    const data: Prisma.SocialAccountUncheckedCreateInput = {
      workspaceId,
      profileId,
      platform: toSocialPlatform(platform),
      connectionMethod: "LATE",
      providerIdentifier: toProviderIdentifier("LATE", platform),
      status: "CONNECTED",
      handle: username,
      name: `${platform} via Late`,
      providerType: "late",
      lateAccountId,
      username,
      displayName: `${platform} via Late`,
      isActive: true,
    };

    if (existing) {
      const account = await prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          connectionMethod: "LATE",
          providerIdentifier: toProviderIdentifier("LATE", platform),
          status: "CONNECTED",
          handle: data.handle,
          name: data.name,
          username: data.username,
          displayName: data.displayName,
          isActive: true,
        },
      });
      return {
        type: "complete",
        account,
        profileId,
        providerType: "late",
      };
    }

    const account = await prisma.socialAccount.create({ data });
    return {
      type: "complete",
      account,
      profileId,
      providerType: "late",
    };
  }

  async refreshToken(_account: SocialAccount): Promise<TokenData> {
    return {
      accessToken: "late-managed",
    };
  }

  async validateConnection(account: SocialAccount): Promise<boolean> {
    return !!account.lateAccountId || !!account.username;
  }
}
