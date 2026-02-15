import { randomBytes } from "crypto";
import { getBaseUrl } from "@/lib/secrets";
import type { Credential, CredentialKind, SocialAccount } from "@prisma/client";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import type {
  BYOCallbackParams,
  BYOAuthUrlParams,
  BYOPlatformProvider,
  OAuthCandidateInternal,
  OAuthClientCredentials,
  PlatformOAuthCallbackResult,
  PlatformOAuthResultComplete,
  ProviderPlatformPost,
  ProviderPost,
  TokenData,
} from "@/lib/providers/types";
import type { Platform } from "@/lib/platforms/types";

const OAUTH_COOKIE_TTL_MS = 10 * 60 * 1000;

export interface OAuthCredentialLookup {
  idTypes: string[];
  secretTypes: string[];
  socialAccountId?: string;
}

export abstract class BaseBYOPlatformProvider implements BYOPlatformProvider {
  public readonly platform: Platform;

  protected constructor(
    protected readonly workspaceId: string,
    platform: Platform,
  ) {
    this.platform = platform;
  }

  abstract generateAuthUrl(params: BYOAuthUrlParams): Promise<{
    url: string;
    state: string;
    codeVerifier?: string;
  }>;

  abstract handleCallback(params: BYOCallbackParams): Promise<PlatformOAuthCallbackResult>;

  async finalizeSelection(
    _tokenData: TokenData,
    _candidate: OAuthCandidateInternal,
  ): Promise<PlatformOAuthResultComplete> {
    throw new Error(`Provider '${this.platform}' does not support multi-step OAuth selection`);
  }

  abstract publishPost(
    post: ProviderPost,
    platformPost: ProviderPlatformPost,
  ): Promise<{
    success: boolean;
    platformPostId?: string;
    platformPostUrl?: string;
    error?: string;
    errorCode?: string;
  }>;

  async refreshToken(account: SocialAccount): Promise<TokenData> {
    const accessToken = this.getAccessToken(account);
    const refreshToken = this.getRefreshToken(account);
    if (!refreshToken) {
      return {
        accessToken,
        expiresAt: account.tokenExpiresAt ?? undefined,
      };
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: account.tokenExpiresAt ?? undefined,
    };
  }

  async validateConnection(account: SocialAccount): Promise<boolean> {
    return !!this.getAccessToken(account);
  }

  protected async getOAuthClientCredentials(
    lookup: OAuthCredentialLookup,
  ): Promise<OAuthClientCredentials> {
    if (lookup.socialAccountId) {
      const accountClientId = await this.findAccountCredentialValue(
        lookup.socialAccountId,
        "APP_ID",
      );
      const accountClientSecret = await this.findAccountCredentialValue(
        lookup.socialAccountId,
        "APP_SECRET",
      );

      if (accountClientId && accountClientSecret) {
        return {
          clientId: accountClientId,
          clientSecret: accountClientSecret,
        };
      }
    }

    const clientId = await this.findCredentialValue(lookup.idTypes);
    const clientSecret = await this.findCredentialValue(lookup.secretTypes);

    if (!clientId || !clientSecret) {
      throw new Error(
        `Missing OAuth app credentials for ${this.platform}. ` +
        `Configure APP_ID/APP_SECRET on the selected account.`,
      );
    }

    return { clientId, clientSecret };
  }

  private async findAccountCredentialValue(
    socialAccountId: string,
    kind: CredentialKind,
  ): Promise<string | null> {
    const credential = await prisma.credential.findUnique({
      where: {
        socialAccountId_kind: {
          socialAccountId,
          kind,
        },
      },
      select: {
        encryptedValue: true,
      },
    });

    if (!credential?.encryptedValue) {
      return null;
    }

    return decrypt(credential.encryptedValue);
  }

  protected async findCredentialValue(types: string[]): Promise<string | null> {
    for (const type of types) {
      const credential = await prisma.credential.findUnique({
        where: {
          workspaceId_type: {
            workspaceId: this.workspaceId,
            type,
          },
        },
      });

      if (credential?.keyEnc) {
        return decrypt(credential.keyEnc);
      }
    }

    return null;
  }

  protected getAccessToken(account: SocialAccount): string {
    if (!account.accessTokenEnc) {
      throw new Error(`Account ${account.id} has no access token`);
    }

    return decrypt(account.accessTokenEnc);
  }

  protected getRefreshToken(account: SocialAccount): string | undefined {
    if (!account.refreshTokenEnc) {
      return undefined;
    }

    return decrypt(account.refreshTokenEnc);
  }

  protected getOAuthMetadata(account: SocialAccount): Record<string, unknown> {
    const metadata = account.oauthMetadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return {};
    }

    return metadata as Record<string, unknown>;
  }

  protected getPostContent(post: ProviderPost, platformPost: ProviderPlatformPost): string {
    return platformPost.customContent ?? post.content ?? "";
  }

  protected getPrimaryMedia(post: ProviderPost): ProviderPost["mediaItems"][number] | undefined {
    return post.mediaItems?.[0];
  }

  protected hasExpiredToken(account: SocialAccount): boolean {
    if (!account.tokenExpiresAt) {
      return false;
    }

    return account.tokenExpiresAt.getTime() <= Date.now() + 60_000;
  }

  protected toUrlQuery(params: Record<string, string | undefined>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        query.set(key, value);
      }
    }

    return query.toString();
  }

  protected async httpJson<T>(
    url: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(url, init);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText}: ${text.slice(0, 500)}`,
      );
    }

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return { raw: text } as T;
    }
  }

  protected async httpForm<T>(
    url: string,
    payload: Record<string, string | undefined>,
    init?: RequestInit,
  ): Promise<T> {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        body.set(key, value);
      }
    }

    return this.httpJson<T>(url, {
      ...init,
      method: init?.method ?? "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(init?.headers ?? {}),
      },
      body,
    });
  }

  protected async readCredential(
    type: string,
  ): Promise<string | null> {
    const credential = await prisma.credential.findUnique({
      where: {
        workspaceId_type: {
          workspaceId: this.workspaceId,
          type,
        },
      },
    });

    if (credential?.keyEnc) {
      return decrypt(credential.keyEnc);
    }

    return null;
  }

  protected defaultRedirectUrl(): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl.replace(/\/$/, "")}/callback`;
  }

  protected randomState(): string {
    return randomBytes(18).toString("base64url");
  }

  static get oauthStateTtlMs(): number {
    return OAUTH_COOKIE_TTL_MS;
  }

  static get oauthStateTtlSeconds(): number {
    return Math.floor(OAUTH_COOKIE_TTL_MS / 1000);
  }
}

export function pickCredentialMetadata(
  credential: Credential | null,
): Record<string, unknown> {
  if (!credential?.metadata) {
    return {};
  }

  if (typeof credential.metadata === "object" && !Array.isArray(credential.metadata)) {
    return credential.metadata as Record<string, unknown>;
  }

  return {};
}
