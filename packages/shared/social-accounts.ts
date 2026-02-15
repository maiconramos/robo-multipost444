import type { Platform } from "./types/platforms";

type SocialPlatform = "INSTAGRAM" | "FACEBOOK" | "THREADS" | "TIKTOK" | "YOUTUBE" | "LINKEDIN" | "X" | "PINTEREST";
type ConnectionMethod = "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE";

const appToSocialPlatformMap: Record<Platform, SocialPlatform> = {
  instagram: "INSTAGRAM",
  facebook: "FACEBOOK",
  threads: "THREADS",
  tiktok: "TIKTOK",
  youtube: "YOUTUBE",
  linkedin: "LINKEDIN",
  twitter: "X",
  pinterest: "PINTEREST",
  bluesky: "X",
  snapchat: "X",
  googlebusiness: "X",
  reddit: "X",
  telegram: "X",
};

const socialToAppPlatformMap: Record<SocialPlatform, Platform> = {
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  THREADS: "threads",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
  LINKEDIN: "linkedin",
  X: "twitter",
  PINTEREST: "pinterest",
};

export type { SocialPlatform, ConnectionMethod };

export function toSocialPlatform(platform: Platform): SocialPlatform {
  const mapped = appToSocialPlatformMap[platform];
  if (!mapped) {
    throw new Error(`Unsupported platform '${platform}'`);
  }
  return mapped;
}

export function fromSocialPlatform(platform: SocialPlatform): Platform {
  const mapped = socialToAppPlatformMap[platform];
  if (!mapped) {
    throw new Error(`Unsupported social platform '${platform}'`);
  }
  return mapped;
}

export function toPlatformForProviders(platform: SocialPlatform): Platform {
  return fromSocialPlatform(platform);
}

export function connectionMethodToLegacyProviderType(
  connectionMethod: ConnectionMethod,
): "late" | "byo" {
  return connectionMethod === "LATE" ? "late" : "byo";
}

export function pickPlatformUserId(
  meta: Record<string, unknown> | null | undefined,
) {
  if (!meta || typeof meta !== "object") {
    return undefined;
  }

  const possibleKeys = [
    "igUserId",
    "pageId",
    "businessAccountId",
    "tiktokUserId",
    "userId",
  ];
  for (const key of possibleKeys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}
