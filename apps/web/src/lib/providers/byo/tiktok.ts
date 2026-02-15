import type { SocialAccount } from "@prisma/client";
import { BaseBYOPlatformProvider } from "@/lib/providers/byo/base";
import type {
  PlatformOAuthCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";

interface TikTokTokenEnvelope {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  scope?: string;
  open_id?: string;
}

interface TikTokTokenResponse {
  data?: TikTokTokenEnvelope;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  open_id?: string;
}

interface TikTokUserInfoResponse {
  data?: {
    user?: {
      open_id?: string;
      union_id?: string;
      avatar_url?: string;
      display_name?: string;
      username?: string;
    };
  };
}

interface TikTokPublishResponse {
  data?: {
    publish_id?: string;
    share_url?: string;
  };
}

function unwrapToken(response: TikTokTokenResponse): TikTokTokenEnvelope {
  if (response.data && typeof response.data === "object") {
    return response.data;
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_in: response.expires_in,
    scope: response.scope,
    open_id: response.open_id,
  };
}

export class TikTokBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "tiktok");
  }

  async generateAuthUrl(params: {
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
  }): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const { clientId } = await this.getOAuthClientCredentials({
      idTypes: ["tiktok_client_key", "tiktok_client_id"],
      secretTypes: ["tiktok_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const query = this.toUrlQuery({
      client_key: clientId,
      response_type: "code",
      redirect_uri: params.redirectUrl,
      scope: "video.publish,video.upload,user.info.basic",
      state: params.state,
    });

    return {
      url: `https://www.tiktok.com/v2/auth/authorize/?${query}`,
      state: params.state,
    };
  }

  async handleCallback(params: {
    code: string;
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
    codeVerifier?: string;
  }): Promise<PlatformOAuthCallbackResult> {
    const { clientId, clientSecret } = await this.getOAuthClientCredentials({
      idTypes: ["tiktok_client_key", "tiktok_client_id"],
      secretTypes: ["tiktok_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const rawToken = await this.httpForm<TikTokTokenResponse>(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        client_key: clientId,
        client_secret: clientSecret,
        code: params.code,
        grant_type: "authorization_code",
        redirect_uri: params.redirectUrl,
      },
    );

    const token = unwrapToken(rawToken);

    if (!token.access_token) {
      throw new Error("TikTok token exchange failed");
    }

    const userInfo = await this.httpJson<TikTokUserInfoResponse>(
      `https://open.tiktokapis.com/v2/user/info/?${this.toUrlQuery({
        fields: "open_id,union_id,avatar_url,display_name,username",
      })}`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

    const user = userInfo.data?.user;
    const openId = user?.open_id || token.open_id;

    return {
      isBetweenSteps: false,
      tokenData: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        scope: token.scope,
        expiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : undefined,
        metadata: {
          openId,
        },
      },
      profile: {
        platformUserId: openId,
        username: user?.username || user?.display_name || `tiktok_${openId || Date.now()}`,
        displayName: user?.display_name,
        profilePicture: user?.avatar_url,
        oauthMetadata: {
          openId,
        },
      },
    };
  }

  async publishPost(
    post: ProviderPost,
    platformPost: ProviderPlatformPost,
  ): Promise<{
    success: boolean;
    platformPostId?: string;
    platformPostUrl?: string;
    error?: string;
    errorCode?: string;
  }> {
    try {
      const accessToken = this.getAccessToken(platformPost.account);
      const media = this.getPrimaryMedia(post);

      if (!media || media.type !== "video") {
        return {
          success: false,
          error: "TikTok BYO currently supports video publishing only",
          errorCode: "VIDEO_REQUIRED",
        };
      }

      const content = this.getPostContent(post, platformPost);

      const publish = await this.httpJson<TikTokPublishResponse>(
        "https://open.tiktokapis.com/v2/post/publish/content/init/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_info: {
              title: content.slice(0, 2200),
              privacy_level: "PUBLIC_TO_EVERYONE",
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: "PULL_FROM_URL",
              video_url: media.url,
            },
          }),
        },
      );

      const publishId = publish.data?.publish_id;

      return {
        success: !!publishId,
        platformPostId: publishId,
        platformPostUrl: publish.data?.share_url,
        error: publishId ? undefined : "TikTok did not return a publish id",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish on TikTok",
      };
    }
  }

  async refreshToken(account: SocialAccount): Promise<TokenData> {
    const refreshToken = this.getRefreshToken(account);
    const accessToken = this.getAccessToken(account);

    if (!refreshToken) {
      return {
        accessToken,
        expiresAt: account.tokenExpiresAt ?? undefined,
      };
    }

    try {
      const { clientId, clientSecret } = await this.getOAuthClientCredentials({
        idTypes: ["tiktok_client_key", "tiktok_client_id"],
        secretTypes: ["tiktok_client_secret"],
        socialAccountId: account.id,
      });

      const rawToken = await this.httpForm<TikTokTokenResponse>(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          client_key: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
      );

      const token = unwrapToken(rawToken);
      if (!token.access_token) {
        throw new Error("TikTok refresh returned no access token");
      }

      return {
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? refreshToken,
        scope: token.scope,
        expiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : account.tokenExpiresAt ?? undefined,
      };
    } catch {
      return {
        accessToken,
        refreshToken,
        expiresAt: account.tokenExpiresAt ?? undefined,
      };
    }
  }

  async validateConnection(account: SocialAccount): Promise<boolean> {
    try {
      const accessToken = this.getAccessToken(account);
      const response = await this.httpJson<TikTokUserInfoResponse>(
        `https://open.tiktokapis.com/v2/user/info/?${this.toUrlQuery({
          fields: "open_id",
        })}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return !!response.data?.user?.open_id;
    } catch {
      return false;
    }
  }
}
