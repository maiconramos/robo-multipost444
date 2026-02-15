import type { SocialAccount } from "@prisma/client";
import { BaseBYOPlatformProvider } from "@/lib/providers/byo/base";
import type {
  PlatformOAuthCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";

interface PinterestTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}

interface PinterestUserResponse {
  username?: string;
  account_type?: string;
  profile_image?: string;
}

interface PinterestBoardsResponse {
  items?: Array<{
    id: string;
    name: string;
  }>;
}

interface PinterestPinResponse {
  id?: string;
}

export class PinterestBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "pinterest");
  }

  async generateAuthUrl(params: {
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
  }): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const { clientId } = await this.getOAuthClientCredentials({
      idTypes: ["pinterest_app_id", "pinterest_client_id"],
      secretTypes: ["pinterest_app_secret", "pinterest_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const query = this.toUrlQuery({
      response_type: "code",
      client_id: clientId,
      redirect_uri: params.redirectUrl,
      scope: "boards:read,pins:write",
      state: params.state,
    });

    return {
      url: `https://www.pinterest.com/oauth/?${query}`,
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
      idTypes: ["pinterest_app_id", "pinterest_client_id"],
      secretTypes: ["pinterest_app_secret", "pinterest_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const token = await this.httpForm<PinterestTokenResponse>(
      "https://api.pinterest.com/v5/oauth/token",
      {
        grant_type: "authorization_code",
        code: params.code,
        redirect_uri: params.redirectUrl,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
      },
    );

    const user = await this.httpJson<PinterestUserResponse>(
      "https://api.pinterest.com/v5/user_account",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

    const boards = await this.httpJson<PinterestBoardsResponse>(
      "https://api.pinterest.com/v5/boards?page_size=25",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

    const board = boards.items?.[0];

    if (!user.username) {
      throw new Error("Failed to resolve Pinterest user profile");
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
        metadata: {
          defaultBoardId: board?.id,
        },
      },
      profile: {
        platformUserId: user.username,
        username: user.username,
        displayName: user.username,
        profilePicture: user.profile_image,
        oauthMetadata: {
          defaultBoardId: board?.id,
          boards: boards.items ?? [],
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
      const media = this.getPrimaryMedia(post);

      if (!media || media.type !== "image") {
        return {
          success: false,
          error: "Pinterest BYO MVP currently supports image pins only",
          errorCode: "UNSUPPORTED_MEDIA",
        };
      }

      const metadata = this.getOAuthMetadata(platformPost.account);
      const platformData =
        platformPost.platformData && typeof platformPost.platformData === "object"
          ? (platformPost.platformData as Record<string, unknown>)
          : {};
      const boardId =
        (typeof platformData.boardId === "string" ? platformData.boardId : undefined) ||
        (typeof metadata.defaultBoardId === "string" ? metadata.defaultBoardId : undefined);

      if (!boardId) {
        throw new Error("Pinterest board id not found. Select a board before publishing.");
      }

      const content = this.getPostContent(post, platformPost);

      const created = await this.httpJson<PinterestPinResponse>(
        "https://api.pinterest.com/v5/pins",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            board_id: boardId,
            title: content.slice(0, 100),
            description: content,
            media_source: {
              source_type: "image_url",
              url: media.url,
            },
          }),
        },
      );

      return {
        success: true,
        platformPostId: created.id,
        platformPostUrl: created.id
          ? `https://www.pinterest.com/pin/${created.id}`
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to publish pin on Pinterest",
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
        idTypes: ["pinterest_app_id", "pinterest_client_id"],
        secretTypes: ["pinterest_app_secret", "pinterest_client_secret"],
        socialAccountId: account.id,
      });

      const token = await this.httpForm<PinterestTokenResponse>(
        "https://api.pinterest.com/v5/oauth/token",
        {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
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
      const user = await this.httpJson<PinterestUserResponse>(
        "https://api.pinterest.com/v5/user_account",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return !!user.username;
    } catch {
      return false;
    }
  }
}
