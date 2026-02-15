import { pgEnum } from "drizzle-orm/pg-core";

export const socialPlatformEnum = pgEnum("SocialPlatform", [
  "INSTAGRAM",
  "FACEBOOK",
  "THREADS",
  "TIKTOK",
  "YOUTUBE",
  "LINKEDIN",
  "X",
  "PINTEREST",
]);

export const connectionMethodEnum = pgEnum("ConnectionMethod", [
  "BYO_OAUTH",
  "BYO_SYSTEM_USER",
  "LATE",
]);

export const socialAccountStatusEnum = pgEnum("SocialAccountStatus", [
  "CONNECTED",
  "DISCONNECTED",
  "ERROR",
]);

export const oauthFlowStatusEnum = pgEnum("OAuthFlowStatus", [
  "AWAITING_SELECTION",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
]);

export const credentialKindEnum = pgEnum("CredentialKind", [
  "APP_ID",
  "APP_SECRET",
  "ACCESS_TOKEN",
  "REFRESH_TOKEN",
  "SYSTEM_USER_TOKEN",
  "LATE_API_KEY",
]);
