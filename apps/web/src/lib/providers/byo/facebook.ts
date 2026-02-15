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
    picture?: {
      data?: { url?: string };
    };
  }>;
}

interface FacebookSelectionData {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  pagePicture?: string;
}

function toCandidate(selection: FacebookSelectionData): OAuthCandidateInternal {
  return {
    id: selection.pageId,
    name: selection.pageName,
    username: `facebook_${selection.pageId}`,
    profilePicture: selection.pagePicture,
    description: "Página Facebook",
    selectionData: selection as unknown as Record<string, unknown>,
  };
}

export class FacebookBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "facebook");
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
      scope: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"].join(","),
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

    const token = await this.httpJson<FacebookTokenResponse>(
      `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${this.toUrlQuery({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: params.redirectUrl,
        code: params.code,
      })}`,
    );

    const pages = await this.httpJson<FacebookPagesResponse>(
      `https://graph.facebook.com/${META_API_VERSION}/me/accounts?${this.toUrlQuery({
        fields: "id,name,access_token,picture{url}",
        access_token: token.access_token,
      })}`,
    );

    const candidates =
      pages.data
        ?.filter((page) => page.id && page.access_token)
        .map((page) =>
          toCandidate({
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token!,
            pagePicture: page.picture?.data?.url,
          }),
        ) ?? [];

    if (candidates.length === 0) {
      throw new Error("No Facebook pages found for this account");
    }

    const pendingTokenData: TokenData = {
      accessToken: token.access_token,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : undefined,
      metadata: {
        source: "facebook-oauth",
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
    const selection = candidate.selectionData as unknown as FacebookSelectionData;
    if (!selection?.pageId || !selection?.pageAccessToken) {
      throw new Error("Invalid Facebook selection payload");
    }

    return {
      tokenData: {
        accessToken: selection.pageAccessToken,
        expiresAt: tokenData.expiresAt,
        metadata: {
          pageId: selection.pageId,
          pageName: selection.pageName,
        },
      },
      profile: {
        platformUserId: selection.pageId,
        username: `facebook_${selection.pageId}`,
        displayName: selection.pageName,
        profilePicture: selection.pagePicture,
        oauthMetadata: {
          pageId: selection.pageId,
          pageName: selection.pageName,
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
      const pageId =
        platformPost.account.platformUserId ||
        (typeof metadata.pageId === "string" ? metadata.pageId : undefined);

      if (!pageId) {
        throw new Error("Facebook page id not found");
      }

      const content = this.getPostContent(post, platformPost);
      const media = this.getPrimaryMedia(post);

      if (media?.type === "video") {
        const video = await this.httpJson<{ id?: string }>(
          `https://graph.facebook.com/${META_API_VERSION}/${pageId}/videos`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              file_url: media.url,
              description: content,
              access_token: token,
            }),
          },
        );

        return {
          success: true,
          platformPostId: video.id,
        };
      }

      if (media?.type === "image") {
        const photo = await this.httpJson<{ id?: string; post_id?: string }>(
          `https://graph.facebook.com/${META_API_VERSION}/${pageId}/photos`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              url: media.url,
              caption: content,
              access_token: token,
            }),
          },
        );

        return {
          success: true,
          platformPostId: photo.post_id || photo.id,
        };
      }

      const textPost = await this.httpJson<{ id?: string }>(
        `https://graph.facebook.com/${META_API_VERSION}/${pageId}/feed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            message: content,
            access_token: token,
          }),
        },
      );

      return {
        success: true,
        platformPostId: textPost.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish on Facebook",
      };
    }
  }

  async refreshToken(account: SocialAccount): Promise<TokenData> {
    // Facebook page tokens are generally long-lived and don't use refresh_token.
    return {
      accessToken: this.getAccessToken(account),
      refreshToken: this.getRefreshToken(account),
      expiresAt: account.tokenExpiresAt ?? undefined,
    };
  }

  async validateConnection(account: SocialAccount): Promise<boolean> {
    try {
      const token = this.getAccessToken(account);
      const metadata = this.getOAuthMetadata(account);
      const pageId =
        account.platformUserId ||
        (typeof metadata.pageId === "string" ? metadata.pageId : undefined);

      if (!pageId) {
        return false;
      }

      const page = await this.httpJson<{ id?: string }>(
        `https://graph.facebook.com/${META_API_VERSION}/${pageId}?${this.toUrlQuery({
          fields: "id,name",
          access_token: token,
        })}`,
      );

      return !!page.id;
    } catch {
      return false;
    }
  }
}
