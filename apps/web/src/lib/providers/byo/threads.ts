import type { SocialAccount } from "@prisma/client";
import { BaseBYOPlatformProvider } from "@/lib/providers/byo/base";
import type {
  PlatformOAuthCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";

interface ThreadsTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string;
}

interface ThreadsProfileResponse {
  id?: string;
  username?: string;
  name?: string;
  threads_profile_picture_url?: string;
}

export class ThreadsBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "threads");
  }

  async generateAuthUrl(params: {
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
  }): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const { clientId } = await this.getOAuthClientCredentials({
      idTypes: ["threads_app_id", "facebook_app_id"],
      secretTypes: ["threads_app_secret", "facebook_app_secret"],
      socialAccountId: params.socialAccountId,
    });

    const scopes = ["threads_basic", "threads_content_publish"].join(",");
    const query = this.toUrlQuery({
      client_id: clientId,
      redirect_uri: params.redirectUrl,
      scope: scopes,
      response_type: "code",
      state: params.state,
    });

    return {
      url: `https://threads.net/oauth/authorize?${query}`,
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
      idTypes: ["threads_app_id", "facebook_app_id"],
      secretTypes: ["threads_app_secret", "facebook_app_secret"],
      socialAccountId: params.socialAccountId,
    });

    const tokenData = await this.httpForm<ThreadsTokenResponse>(
      "https://graph.threads.net/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: params.redirectUrl,
        code: params.code,
      },
    );

    const profile = await this.httpJson<ThreadsProfileResponse>(
      `https://graph.threads.net/v1.0/me?${this.toUrlQuery({
        fields: "id,username,name,threads_profile_picture_url",
        access_token: tokenData.access_token,
      })}`,
    );

    return {
      isBetweenSteps: false,
      tokenData: {
        accessToken: tokenData.access_token,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : undefined,
        metadata: {
          userId: tokenData.user_id ?? profile.id,
        },
      },
      profile: {
        platformUserId: profile.id ?? tokenData.user_id,
        username: profile.username ?? `threads_${Date.now()}`,
        displayName: profile.name,
        profilePicture: profile.threads_profile_picture_url,
        oauthMetadata: {
          userId: profile.id ?? tokenData.user_id,
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
      const token = this.getAccessToken(platformPost.account);
      const metadata = this.getOAuthMetadata(platformPost.account);
      const userId =
        platformPost.account.platformUserId ||
        (typeof metadata.userId === "string" ? metadata.userId : undefined);

      if (!userId) {
        throw new Error("Threads user id not found on account metadata");
      }

      const text = this.getPostContent(post, platformPost);
      const media = this.getPrimaryMedia(post);

      const containerParams = new URLSearchParams();
      containerParams.set("access_token", token);
      containerParams.set("text", text);

      if (media?.type === "image") {
        containerParams.set("media_type", "IMAGE");
        containerParams.set("image_url", media.url);
      } else {
        containerParams.set("media_type", "TEXT");
      }

      const creation = await this.httpJson<{ id?: string }>(
        `https://graph.threads.net/v1.0/${userId}/threads`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: containerParams,
        },
      );

      if (!creation.id) {
        throw new Error("Threads did not return a creation id");
      }

      const publishParams = new URLSearchParams();
      publishParams.set("access_token", token);
      publishParams.set("creation_id", creation.id);

      const published = await this.httpJson<{ id?: string }>(
        `https://graph.threads.net/v1.0/${userId}/threads_publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: publishParams,
        },
      );

      return {
        success: true,
        platformPostId: published.id,
        platformPostUrl: published.id
          ? `https://www.threads.net/t/${published.id}`
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to publish post on Threads",
      };
    }
  }

  async refreshToken(account: SocialAccount): Promise<TokenData> {
    const accessToken = this.getAccessToken(account);

    try {
      const refreshed = await this.httpJson<ThreadsTokenResponse>(
        `https://graph.threads.net/refresh_access_token?${this.toUrlQuery({
          grant_type: "th_refresh_token",
          access_token: accessToken,
        })}`,
      );

      return {
        accessToken: refreshed.access_token,
        refreshToken: this.getRefreshToken(account),
        expiresAt: refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000)
          : account.tokenExpiresAt ?? undefined,
      };
    } catch {
      return {
        accessToken,
        refreshToken: this.getRefreshToken(account),
        expiresAt: account.tokenExpiresAt ?? undefined,
      };
    }
  }

  async validateConnection(account: SocialAccount): Promise<boolean> {
    try {
      const accessToken = this.getAccessToken(account);
      const result = await this.httpJson<{ id?: string }>(
        `https://graph.threads.net/v1.0/me?${this.toUrlQuery({
          fields: "id",
          access_token: accessToken,
        })}`,
      );

      return !!result.id;
    } catch {
      return false;
    }
  }
}
