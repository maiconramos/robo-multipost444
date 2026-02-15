import { createHash, randomBytes } from "crypto";
import type { SocialAccount } from "@prisma/client";
import { BaseBYOPlatformProvider } from "@/lib/providers/byo/base";
import type {
  PlatformOAuthCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";

interface TwitterTokenResponse {
  token_type?: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface TwitterUserResponse {
  data?: {
    id: string;
    username: string;
    name?: string;
    profile_image_url?: string;
  };
}

interface TwitterUploadResponse {
  media_id_string?: string;
}

interface TwitterCreateTweetResponse {
  data?: {
    id: string;
    text?: string;
  };
}

function toBase64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function codeChallengeFromVerifier(verifier: string): string {
  return toBase64Url(createHash("sha256").update(verifier).digest());
}

export class TwitterBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "twitter");
  }

  async generateAuthUrl(params: {
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
  }): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const { clientId } = await this.getOAuthClientCredentials({
      idTypes: ["twitter_client_id"],
      secretTypes: ["twitter_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const codeVerifier = toBase64Url(randomBytes(48));
    const codeChallenge = codeChallengeFromVerifier(codeVerifier);
    const scopes = ["tweet.write", "users.read", "offline.access"].join(" ");

    const query = this.toUrlQuery({
      response_type: "code",
      client_id: clientId,
      redirect_uri: params.redirectUrl,
      scope: scopes,
      state: params.state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return {
      url: `https://twitter.com/i/oauth2/authorize?${query}`,
      state: params.state,
      codeVerifier,
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
    if (!params.codeVerifier) {
      throw new Error("Twitter callback requires PKCE code verifier");
    }

    const { clientId, clientSecret } = await this.getOAuthClientCredentials({
      idTypes: ["twitter_client_id"],
      secretTypes: ["twitter_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const token = await this.httpForm<TwitterTokenResponse>(
      "https://api.x.com/2/oauth2/token",
      {
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: params.redirectUrl,
        client_id: clientId,
        code_verifier: params.codeVerifier,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
      },
    );

    const me = await this.httpJson<TwitterUserResponse>(
      `https://api.x.com/2/users/me?${this.toUrlQuery({
        "user.fields": "id,username,name,profile_image_url",
      })}`,
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

    if (!me.data?.id || !me.data.username) {
      throw new Error("Failed to resolve Twitter user profile");
    }

    return {
      isBetweenSteps: false,
      tokenData: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        scope: token.scope,
        expiresAt: token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : undefined,
      },
      profile: {
        platformUserId: me.data.id,
        username: me.data.username,
        displayName: me.data.name,
        profilePicture: me.data.profile_image_url,
        oauthMetadata: {
          userId: me.data.id,
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
      const text = this.getPostContent(post, platformPost);
      const media = this.getPrimaryMedia(post);

      let mediaId: string | undefined;

      if (media?.type === "image") {
        const mediaResponse = await fetch(media.url);
        if (mediaResponse.ok) {
          const mediaBlob = await mediaResponse.blob();
          const formData = new FormData();
          formData.append("media", mediaBlob, "image.jpg");

          const upload = await this.httpJson<TwitterUploadResponse>(
            "https://upload.twitter.com/1.1/media/upload.json",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            },
          );

          mediaId = upload.media_id_string;
        }
      }

      const payload: Record<string, unknown> = { text };
      if (mediaId) {
        payload.media = { media_ids: [mediaId] };
      }

      const created = await this.httpJson<TwitterCreateTweetResponse>(
        "https://api.x.com/2/tweets",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const tweetId = created.data?.id;

      return {
        success: true,
        platformPostId: tweetId,
        platformPostUrl: tweetId
          ? `https://x.com/i/web/status/${tweetId}`
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish on X",
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
        idTypes: ["twitter_client_id"],
        secretTypes: ["twitter_client_secret"],
        socialAccountId: account.id,
      });

      const token = await this.httpForm<TwitterTokenResponse>(
        "https://api.x.com/2/oauth2/token",
        {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
        },
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
        },
      );

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
      const token = this.getAccessToken(account);
      const me = await this.httpJson<TwitterUserResponse>(
        "https://api.x.com/2/users/me",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return !!me.data?.id;
    } catch {
      return false;
    }
  }
}
