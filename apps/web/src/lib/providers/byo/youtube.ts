import type { SocialAccount } from "@prisma/client";
import { BaseBYOPlatformProvider } from "@/lib/providers/byo/base";
import type {
  PlatformOAuthCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface YouTubeChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      customUrl?: string;
      thumbnails?: {
        default?: { url?: string };
      };
    };
  }>;
}

interface YouTubeVideoResponse {
  id?: string;
}

export class YouTubeBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "youtube");
  }

  async generateAuthUrl(params: {
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
  }): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const { clientId } = await this.getOAuthClientCredentials({
      idTypes: ["youtube_client_id", "google_client_id"],
      secretTypes: ["youtube_client_secret", "google_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const query = this.toUrlQuery({
      client_id: clientId,
      redirect_uri: params.redirectUrl,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.upload",
      access_type: "offline",
      prompt: "consent",
      state: params.state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${query}`,
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
      idTypes: ["youtube_client_id", "google_client_id"],
      secretTypes: ["youtube_client_secret", "google_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const token = await this.httpForm<GoogleTokenResponse>(
      "https://oauth2.googleapis.com/token",
      {
        code: params.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: params.redirectUrl,
        grant_type: "authorization_code",
      },
    );

    const channels = await this.httpJson<YouTubeChannelsResponse>(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

    const channel = channels.items?.[0];
    if (!channel?.id) {
      throw new Error("No YouTube channel found for this account");
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
        platformUserId: channel.id,
        username: channel.snippet?.customUrl || channel.snippet?.title || channel.id,
        displayName: channel.snippet?.title || channel.id,
        profilePicture: channel.snippet?.thumbnails?.default?.url,
        oauthMetadata: {
          channelId: channel.id,
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
          error: "YouTube publishing requires a video media item",
          errorCode: "VIDEO_REQUIRED",
        };
      }

      const platformData =
        platformPost.platformData && typeof platformPost.platformData === "object"
          ? (platformPost.platformData as Record<string, unknown>)
          : {};

      const title =
        (typeof platformData.title === "string" ? platformData.title : undefined) ||
        (this.getPostContent(post, platformPost).slice(0, 100) || "Scheduled video");
      const description = this.getPostContent(post, platformPost);
      const visibility =
        typeof platformData.visibility === "string" &&
        (platformData.visibility === "public" ||
          platformData.visibility === "private" ||
          platformData.visibility === "unlisted")
          ? platformData.visibility
          : "private";
      const madeForKids =
        typeof platformData.madeForKids === "boolean"
          ? platformData.madeForKids
          : false;
      const tags = Array.isArray(platformData.tags)
        ? platformData.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
      const thumbnailUrl =
        platformData.thumbnail &&
        typeof platformData.thumbnail === "object" &&
        typeof (platformData.thumbnail as Record<string, unknown>).url === "string"
          ? ((platformData.thumbnail as Record<string, unknown>).url as string)
          : undefined;

      const session = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": media.contentType || "video/mp4",
          },
          body: JSON.stringify({
            snippet: {
              title,
              description,
              tags,
            },
            status: {
              privacyStatus: visibility,
              selfDeclaredMadeForKids: madeForKids,
            },
          }),
        },
      );

      if (!session.ok) {
        throw new Error(`YouTube upload init failed (${session.status})`);
      }

      const uploadUrl = session.headers.get("location");
      if (!uploadUrl) {
        throw new Error("YouTube resumable upload URL was not returned");
      }

      const videoResponse = await fetch(media.url);
      if (!videoResponse.ok) {
        throw new Error("Failed to download video before upload");
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": media.contentType || "video/mp4",
          "Content-Length": String(videoBuffer.byteLength),
        },
        body: videoBuffer,
      });

      if (!upload.ok) {
        const uploadText = await upload.text();
        throw new Error(
          `YouTube upload failed (${upload.status}): ${uploadText.slice(0, 400)}`,
        );
      }

      const uploaded = (await upload.json()) as YouTubeVideoResponse;

      if (thumbnailUrl && uploaded.id) {
        const thumbnailResponse = await fetch(thumbnailUrl);
        if (!thumbnailResponse.ok) {
          throw new Error(
            `Failed to download YouTube thumbnail (${thumbnailResponse.status})`,
          );
        }

        const thumbnailBuffer = await thumbnailResponse.arrayBuffer();
        const thumbnailUpload = await fetch(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${uploaded.id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type":
                thumbnailResponse.headers.get("content-type") || "image/jpeg",
            },
            body: thumbnailBuffer,
          },
        );

        if (!thumbnailUpload.ok) {
          const thumbnailError = await thumbnailUpload.text();
          throw new Error(
            `YouTube thumbnail upload failed (${thumbnailUpload.status}): ${thumbnailError.slice(
              0,
              400,
            )}`,
          );
        }
      }

      return {
        success: true,
        platformPostId: uploaded.id,
        platformPostUrl: uploaded.id
          ? `https://www.youtube.com/watch?v=${uploaded.id}`
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish on YouTube",
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
        idTypes: ["youtube_client_id", "google_client_id"],
        secretTypes: ["youtube_client_secret", "google_client_secret"],
        socialAccountId: account.id,
      });

      const token = await this.httpForm<GoogleTokenResponse>(
        "https://oauth2.googleapis.com/token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        },
      );

      return {
        accessToken: token.access_token,
        refreshToken,
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
      const channels = await this.httpJson<YouTubeChannelsResponse>(
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return !!channels.items?.length;
    } catch {
      return false;
    }
  }
}
