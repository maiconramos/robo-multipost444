import type { SocialAccount } from "@prisma/client";
import { BaseBYOPlatformProvider } from "@/lib/providers/byo/base";
import type {
  PlatformOAuthCallbackResult,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";

interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface LinkedInProfileResponse {
  id?: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  firstName?: {
    localized?: Record<string, string>;
    preferredLocale?: { language: string; country: string };
  };
  lastName?: {
    localized?: Record<string, string>;
    preferredLocale?: { language: string; country: string };
  };
}

interface LinkedInImageInitResponse {
  value?: {
    image?: string;
    uploadUrl?: string;
  };
}

interface LinkedInPostResponse {
  id?: string;
}

function getLocalizedName(
  field:
    | LinkedInProfileResponse["firstName"]
    | LinkedInProfileResponse["lastName"],
): string | undefined {
  if (!field?.localized) {
    return undefined;
  }

  const preferred = field.preferredLocale;
  if (preferred) {
    const key = `${preferred.language}_${preferred.country}`;
    if (field.localized[key]) {
      return field.localized[key];
    }
  }

  return Object.values(field.localized)[0];
}

function getLinkedInHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202405",
  };
}

export class LinkedInBYOProvider extends BaseBYOPlatformProvider {
  constructor(workspaceId: string) {
    super(workspaceId, "linkedin");
  }

  async generateAuthUrl(params: {
    state: string;
    profileId: string;
    redirectUrl: string;
    socialAccountId: string;
  }): Promise<{ url: string; state: string; codeVerifier?: string }> {
    const { clientId } = await this.getOAuthClientCredentials({
      idTypes: ["linkedin_client_id"],
      secretTypes: ["linkedin_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const query = this.toUrlQuery({
      response_type: "code",
      client_id: clientId,
      redirect_uri: params.redirectUrl,
      scope: "w_member_social r_liteprofile",
      state: params.state,
    });

    return {
      url: `https://www.linkedin.com/oauth/v2/authorization?${query}`,
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
      idTypes: ["linkedin_client_id"],
      secretTypes: ["linkedin_client_secret"],
      socialAccountId: params.socialAccountId,
    });

    const token = await this.httpForm<LinkedInTokenResponse>(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        grant_type: "authorization_code",
        code: params.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: params.redirectUrl,
      },
    );

    const me = await this.httpJson<LinkedInProfileResponse>(
      "https://api.linkedin.com/v2/me",
      {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      },
    );

    if (!me.id) {
      throw new Error("Failed to resolve LinkedIn profile");
    }

    const firstName = me.localizedFirstName || getLocalizedName(me.firstName);
    const lastName = me.localizedLastName || getLocalizedName(me.lastName);
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();

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
        platformUserId: me.id,
        username: `linkedin_${me.id}`,
        displayName: displayName || `LinkedIn ${me.id}`,
        oauthMetadata: {
          personUrn: `urn:li:person:${me.id}`,
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
      const metadata = this.getOAuthMetadata(platformPost.account);
      const personId = platformPost.account.platformUserId;

      if (!personId) {
        throw new Error("LinkedIn person id not found");
      }

      const author =
        (typeof metadata.personUrn === "string" && metadata.personUrn) ||
        `urn:li:person:${personId}`;
      const content = this.getPostContent(post, platformPost);
      const media = this.getPrimaryMedia(post);

      let imageUrn: string | undefined;

      if (media?.type === "image") {
        const init = await this.httpJson<LinkedInImageInitResponse>(
          "https://api.linkedin.com/rest/images?action=initializeUpload",
          {
            method: "POST",
            headers: getLinkedInHeaders(accessToken),
            body: JSON.stringify({
              initializeUploadRequest: {
                owner: author,
              },
            }),
          },
        );

        const uploadUrl = init.value?.uploadUrl;
        imageUrn = init.value?.image;

        if (uploadUrl && imageUrn) {
          const imageResponse = await fetch(media.url);
          if (imageResponse.ok) {
            const imageData = await imageResponse.arrayBuffer();
            await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": media.contentType || "image/jpeg",
              },
              body: imageData,
            });
          }
        }
      }

      const postPayload: Record<string, unknown> = {
        author,
        commentary: content,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      };

      if (imageUrn) {
        postPayload.content = {
          media: {
            id: imageUrn,
          },
        };
      }

      const created = await this.httpJson<LinkedInPostResponse>(
        "https://api.linkedin.com/rest/posts",
        {
          method: "POST",
          headers: getLinkedInHeaders(accessToken),
          body: JSON.stringify(postPayload),
        },
      );

      return {
        success: true,
        platformPostId: created.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to publish on LinkedIn",
      };
    }
  }

  async refreshToken(account: SocialAccount): Promise<TokenData> {
    // Most LinkedIn app setups return short-lived access token without refresh token.
    return {
      accessToken: this.getAccessToken(account),
      refreshToken: this.getRefreshToken(account),
      expiresAt: account.tokenExpiresAt ?? undefined,
    };
  }

  async validateConnection(account: SocialAccount): Promise<boolean> {
    try {
      const accessToken = this.getAccessToken(account);
      const me = await this.httpJson<LinkedInProfileResponse>(
        "https://api.linkedin.com/v2/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return !!me.id;
    } catch {
      return false;
    }
  }
}
