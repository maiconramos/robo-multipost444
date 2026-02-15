import type {
  MediaItem,
  PlatformPost,
  Post,
  SocialAccount,
} from "@prisma/client";
import type { Platform } from "@/lib/platforms/types";

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthUrlResult {
  url: string;
  state: string;
  codeVerifier?: string;
}

export interface OAuthAuthUrlOptions {
  socialAccountId?: string;
  providerIdentifier?: string;
}

export interface OAuthCallbackOptions {
  redirectUrl?: string;
  codeVerifier?: string;
  socialAccountId?: string;
  providerIdentifier?: string;
}

export type ProviderCallbackResult =
  | {
    type: "complete";
    account: SocialAccount;
    profileId: string;
    providerType: "late" | "byo";
  }
  | {
    type: "pending";
    flowId: string;
    platform: Platform;
    profileId: string;
    providerType: "byo";
    candidates: OAuthCandidatePublic[];
  };

export type ProviderPost = Post & { mediaItems: MediaItem[] };

export type ProviderPlatformPost = PlatformPost & {
  account: SocialAccount;
  post?: Post;
};

export interface PostingProvider {
  publishPost(
    post: ProviderPost,
    platformPost: ProviderPlatformPost,
  ): Promise<PublishResult>;

  getAuthUrl(
    platform: Platform,
    profileId: string,
    redirectUrl: string,
    workspaceId: string,
    options?: OAuthAuthUrlOptions,
  ): Promise<AuthUrlResult>;

  handleCallback(
    platform: Platform,
    code: string,
    state: string,
    workspaceId: string,
    profileId: string,
    options?: OAuthCallbackOptions,
  ): Promise<ProviderCallbackResult>;

  refreshToken(account: SocialAccount): Promise<TokenData>;

  validateConnection(account: SocialAccount): Promise<boolean>;
}

export interface OAuthClientCredentials {
  clientId: string;
  clientSecret: string;
}

export interface PlatformOAuthProfile {
  platformUserId?: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  oauthMetadata?: Record<string, unknown>;
}

export interface OAuthCandidatePublic {
  id: string;
  name: string;
  username?: string;
  profilePicture?: string;
  description?: string;
}

export interface OAuthCandidateInternal extends OAuthCandidatePublic {
  selectionData: Record<string, unknown>;
}

export interface PlatformOAuthResultComplete {
  tokenData: TokenData;
  profile: PlatformOAuthProfile;
}

export type PlatformOAuthCallbackResult =
  | ({
    isBetweenSteps: false;
  } & PlatformOAuthResultComplete)
  | {
    isBetweenSteps: true;
    tokenData: TokenData;
    candidates: OAuthCandidateInternal[];
  };

export interface BYOAuthUrlParams {
  state: string;
  profileId: string;
  redirectUrl: string;
  socialAccountId: string;
}

export interface BYOCallbackParams {
  code: string;
  state: string;
  profileId: string;
  redirectUrl: string;
  socialAccountId: string;
  codeVerifier?: string;
}

export interface BYOPlatformProvider {
  readonly platform: Platform;

  generateAuthUrl(params: BYOAuthUrlParams): Promise<AuthUrlResult>;

  handleCallback(params: BYOCallbackParams): Promise<PlatformOAuthCallbackResult>;

  finalizeSelection?(
    tokenData: TokenData,
    candidate: OAuthCandidateInternal,
  ): Promise<PlatformOAuthResultComplete>;

  publishPost(
    post: ProviderPost,
    platformPost: ProviderPlatformPost,
  ): Promise<PublishResult>;

  refreshToken(account: SocialAccount): Promise<TokenData>;

  validateConnection(account: SocialAccount): Promise<boolean>;
}
