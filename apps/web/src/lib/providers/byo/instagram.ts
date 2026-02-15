import type { SocialAccount } from "@prisma/client";
import { BaseBYOPlatformProvider } from "@/lib/providers/byo/base";
import { META_API_VERSION } from "@/lib/providers/meta-config";
import type {
  OAuthCandidateInternal,
  PlatformOAuthCallbackResult,
  PlatformOAuthResultComplete,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";

interface FacebookTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface FacebookPagesResponse {
  data?: Array<{
    id: string;
    name: string;
    access_token?: string;
    instagram_business_account?: {
      id: string;
      username?: string;
      profile_picture_url?: string;
      name?: string;
    };
  }>;
}

interface InstagramSelectionData {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igUserId: string;
  igUsername: string;
  igDisplayName: string;
  igProfilePicture?: string;
}

const INSTAGRAM_MEDIA_POLL_INTERVAL_MS_DEFAULT = 30 * 1000;
const INSTAGRAM_MEDIA_PROCESSING_TIMEOUT_MS_DEFAULT = 5 * 60 * 1000;

function parsePositiveIntegerEnv(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeMimeType(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.split(";")[0]?.trim().toLowerCase() || "";
}

function hasMp4UrlExtension(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".mp4");
  } catch {
    return url.toLowerCase().split("?")[0].endsWith(".mp4");
  }
}

function toCandidate(selection: InstagramSelectionData): OAuthCandidateInternal {
  return {
    id: selection.igUserId,
    name: selection.igDisplayName,
    username: selection.igUsername,
    profilePicture: selection.igProfilePicture,
    description: `Página Facebook: ${selection.pageName}`,
    selectionData: selection as unknown as Record<string, unknown>,
  };
}

export class InstagramBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "instagram");
  }

  async generateAuthUrl(params: {
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
  }): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const { clientId } = await this.getOAuthClientCredentials({
      idTypes: ["facebook_app_id"],
      secretTypes: ["facebook_app_secret"],
      socialAccountId: params.socialAccountId,
    });

    const query = this.toUrlQuery({
      client_id: clientId,
      redirect_uri: params.redirectUrl,
      state: params.state,
      response_type: "code",
      scope: [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "business_management",
      ].join(","),
    });

    return {
      url: `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${query}`,
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
      idTypes: ["facebook_app_id"],
      secretTypes: ["facebook_app_secret"],
      socialAccountId: params.socialAccountId,
    });

    const userToken = await this.httpJson<FacebookTokenResponse>(
      `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${this.toUrlQuery({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: params.redirectUrl,
        code: params.code,
      })}`,
    );

    const pages = await this.httpJson<FacebookPagesResponse>(
      `https://graph.facebook.com/${META_API_VERSION}/me/accounts?${this.toUrlQuery({
        fields: "id,name,access_token,instagram_business_account{id,username,profile_picture_url,name}",
        access_token: userToken.access_token,
      })}`,
    );

    const candidates =
      pages.data
        ?.filter((page) => page.instagram_business_account?.id && page.access_token)
        .map((page) => {
          const ig = page.instagram_business_account!;
          const selectionData: InstagramSelectionData = {
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token!,
            igUserId: ig.id,
            igUsername: ig.username || `instagram_${ig.id}`,
            igDisplayName: ig.name || ig.username || `Instagram User ${ig.id}`,
            igProfilePicture: ig.profile_picture_url,
          };

          return toCandidate(selectionData);
        }) ?? [];

    if (candidates.length === 0) {
      throw new Error(
        "No Instagram Business account found. Connect a Facebook Page with Instagram Business profile.",
      );
    }

    const pendingTokenData: TokenData = {
      accessToken: userToken.access_token,
      expiresAt: userToken.expires_in
        ? new Date(Date.now() + userToken.expires_in * 1000)
        : undefined,
      metadata: {
        source: "instagram-facebook-oauth",
      },
    };

    if (candidates.length === 1) {
      const finalized = await this.finalizeSelection(pendingTokenData, candidates[0]);
      return {
        isBetweenSteps: false,
        ...finalized,
      };
    }

    return {
      isBetweenSteps: true,
      tokenData: pendingTokenData,
      candidates,
    };
  }

  async finalizeSelection(
    tokenData: TokenData,
    candidate: OAuthCandidateInternal,
  ): Promise<PlatformOAuthResultComplete> {
    const selection = candidate.selectionData as unknown as InstagramSelectionData;
    if (!selection?.pageId || !selection?.igUserId || !selection?.pageAccessToken) {
      throw new Error("Invalid Instagram selection payload");
    }

    return {
      tokenData: {
        accessToken: selection.pageAccessToken,
        expiresAt: tokenData.expiresAt,
        metadata: {
          pageId: selection.pageId,
          pageName: selection.pageName,
          igUserId: selection.igUserId,
        },
      },
      profile: {
        platformUserId: selection.igUserId,
        username: selection.igUsername,
        displayName: selection.igDisplayName,
        profilePicture: selection.igProfilePicture,
        oauthMetadata: {
          pageId: selection.pageId,
          pageName: selection.pageName,
          igUserId: selection.igUserId,
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

      if (!media) {
        return {
          success: false,
          error: "Instagram publishing requires one media item",
          errorCode: "MEDIA_REQUIRED",
        };
      }

      const metadata = this.getOAuthMetadata(platformPost.account);
      const igUserId =
        platformPost.account.platformUserId ||
        (typeof metadata.igUserId === "string" ? metadata.igUserId : undefined);

      if (!igUserId) {
        throw new Error("Instagram business user id not found");
      }

      const caption = this.getPostContent(post, platformPost);
      const platformData =
        platformPost.platformData && typeof platformPost.platformData === "object"
          ? (platformPost.platformData as Record<string, unknown>)
          : {};
      const postType =
        typeof platformData.postType === "string" &&
        (platformData.postType === "feed" ||
          platformData.postType === "reel" ||
          platformData.postType === "story")
          ? platformData.postType
          : media.type === "video"
            ? "reel"
            : "feed";

      if (postType === "feed" && media.type !== "image") {
        return {
          success: false,
          error: "Instagram feed posts require image media",
          errorCode: "UNSUPPORTED_MEDIA",
        };
      }

      if (postType === "reel" && media.type !== "video") {
        return {
          success: false,
          error: "Instagram reel posts require video media",
          errorCode: "UNSUPPORTED_MEDIA",
        };
      }

      if (media.type === "video") {
        if (normalizeMimeType(media.contentType) !== "video/mp4") {
          return {
            success: false,
            error: "Instagram video posts require MP4 media (video/mp4).",
            errorCode: "UNSUPPORTED_MEDIA",
          };
        }

        if (!hasMp4UrlExtension(media.url)) {
          return {
            success: false,
            error: "Instagram video URL must end with .mp4.",
            errorCode: "UNSUPPORTED_MEDIA",
          };
        }
      }

      const params = new URLSearchParams({
        access_token: accessToken,
      });

      if (caption) {
        params.set("caption", caption);
      }

      if (postType === "feed") {
        params.set("image_url", media.url);
      } else if (postType === "story") {
        params.set("media_type", "STORIES");
        if (media.type === "video") {
          params.set("video_url", media.url);
        } else {
          params.set("image_url", media.url);
        }
      } else {
        const reelShareToFeed =
          typeof platformData.reelShareToFeed === "boolean"
            ? platformData.reelShareToFeed
            : true;
        params.set("media_type", "REELS");
        params.set("video_url", media.url);
        params.set("share_to_feed", reelShareToFeed ? "true" : "false");

        const reelThumbnail =
          platformData.reelFeedThumbnail &&
          typeof platformData.reelFeedThumbnail === "object" &&
          typeof (platformData.reelFeedThumbnail as Record<string, unknown>).url === "string"
            ? ((platformData.reelFeedThumbnail as Record<string, unknown>)
                .url as string)
            : undefined;

        if (reelShareToFeed) {
          if (reelThumbnail) {
            params.set("cover_url", reelThumbnail);
          } else {
            params.set("thumb_offset", "1000");
          }
        }
      }

      const container = await this.httpJson<{
        id?: string;
        error?: { message?: string };
      }>(
        `https://graph.facebook.com/${META_API_VERSION}/${igUserId}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        },
      );

      if (!container.id) {
        throw new Error(
          container.error?.message || "Failed to create Instagram media container",
        );
      }

      if (media.type === "video") {
        await this.waitForContainerReady(container.id, accessToken);
      }

      const published = await this.httpJson<{ id?: string }>(
        `https://graph.facebook.com/${META_API_VERSION}/${igUserId}/media_publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            creation_id: container.id,
            access_token: accessToken,
          }),
        },
      );

      if (!published.id) {
        throw new Error("Instagram publish failed: API returned success but no ID");
      }

      return {
        success: true,
        platformPostId: published.id,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Timed out waiting for Instagram media processing")
      ) {
        return {
          success: false,
          error: error.message,
          errorCode: "PROCESSING_TIMEOUT",
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish on Instagram",
      };
    }
  }

  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
  ): Promise<void> {
    const pollIntervalMs = parsePositiveIntegerEnv(
      process.env.INSTAGRAM_MEDIA_POLL_INTERVAL_MS,
      INSTAGRAM_MEDIA_POLL_INTERVAL_MS_DEFAULT,
    );
    const timeoutMs = parsePositiveIntegerEnv(
      process.env.INSTAGRAM_MEDIA_PROCESSING_TIMEOUT_MS,
      INSTAGRAM_MEDIA_PROCESSING_TIMEOUT_MS_DEFAULT,
    );
    const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs));
    let lastStatusCode = "UNKNOWN";

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const status = await this.httpJson<{
        status?: string;
        status_code?: string;
      }>(
        `https://graph.facebook.com/${META_API_VERSION}/${containerId}?${this.toUrlQuery({
          fields: "status,status_code",
          access_token: accessToken,
        })}`,
      );

      const statusCode = (status.status_code || status.status || "").toUpperCase();
      if (statusCode) {
        lastStatusCode = statusCode;
      }

      if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
        return;
      }

      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        throw new Error(
          `Instagram media container processing failed with status ${statusCode}`,
        );
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    throw new Error(
      `Timed out waiting for Instagram media processing (last status: ${lastStatusCode}, waited ${Math.floor((maxAttempts * pollIntervalMs) / 1000)}s)`,
    );
  }

  async refreshToken(account: SocialAccount): Promise<TokenData> {
    const accessToken = this.getAccessToken(account);

    try {
      const refreshed = await this.httpJson<FacebookTokenResponse>(
        `https://graph.instagram.com/refresh_access_token?${this.toUrlQuery({
          grant_type: "ig_refresh_token",
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
      const metadata = this.getOAuthMetadata(account);
      const igUserId =
        account.platformUserId ||
        (typeof metadata.igUserId === "string" ? metadata.igUserId : undefined);

      if (!igUserId) {
        return false;
      }

      const result = await this.httpJson<{ id?: string }>(
        `https://graph.facebook.com/v21.0/${igUserId}?${this.toUrlQuery({
          fields: "id,username",
          access_token: accessToken,
        })}`,
      );

      return !!result.id;
    } catch {
      return false;
    }
  }
}
