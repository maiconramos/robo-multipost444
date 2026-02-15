import { PLATFORMS, type Platform } from "@/lib/platforms/types";
import type {
  ProviderCatalogEntry,
  ProviderConnectionMethod,
  ProviderCredentialKind,
  ProviderStatus,
} from "@/lib/providers/catalog/types";

const activeLatePlatforms = new Set<Platform>([
  "instagram",
  "facebook",
  "threads",
  "tiktok",
]);

const activeByoOAuthPlatforms = new Set<Platform>([
  "instagram",
  "facebook",
  "threads",
  "youtube",
  "linkedin",
  "pinterest",
  "twitter",
]);

const activeByoSystemUserPlatforms = new Set<Platform>([
  "instagram",
  "facebook",
  "threads",
]);

const providerDescriptions: Record<Platform, string> = {
  instagram: "Business and creator profiles",
  facebook: "Pages and business assets",
  threads: "Thread-ready publishing",
  tiktok: "Video-first publishing",
  youtube: "Long and short-form video publishing",
  linkedin: "Professional network publishing",
  pinterest: "Pins and board publishing",
  twitter: "X timeline publishing",
  bluesky: "Federated social publishing",
  snapchat: "Snapchat publishing",
  googlebusiness: "Google Business publishing",
  reddit: "Subreddit publishing",
  telegram: "Telegram channel publishing",
};

function providerIdentifier(
  connectionMethod: ProviderConnectionMethod,
  platform: Platform,
): string {
  return `${connectionMethod.toLowerCase()}.${platform}`;
}

function requiredCredentials(
  method: ProviderConnectionMethod,
): ProviderCredentialKind[] {
  if (method === "LATE") {
    return ["LATE_API_KEY"];
  }

  if (method === "BYO_SYSTEM_USER") {
    return ["SYSTEM_USER_TOKEN"];
  }

  return ["APP_ID", "APP_SECRET"];
}

function optionalCredentials(
  method: ProviderConnectionMethod,
): ProviderCredentialKind[] {
  if (method === "BYO_OAUTH") {
    return ["ACCESS_TOKEN", "REFRESH_TOKEN"];
  }

  return [];
}

function statusFor(
  platform: Platform,
  method: ProviderConnectionMethod,
): ProviderStatus {
  if (method === "LATE") {
    return activeLatePlatforms.has(platform) ? "active" : "coming_soon";
  }

  if (method === "BYO_SYSTEM_USER") {
    return activeByoSystemUserPlatforms.has(platform)
      ? "active"
      : "coming_soon";
  }

  return activeByoOAuthPlatforms.has(platform) ? "active" : "coming_soon";
}

function connectModeFor(method: ProviderConnectionMethod) {
  if (method === "LATE") {
    return "external_url" as const;
  }

  if (method === "BYO_SYSTEM_USER") {
    return "custom_fields" as const;
  }

  return "oauth" as const;
}

function settingsKeyFor(platform: Platform) {
  if (platform === "instagram") {
    return {
      composerSettingsKey: "instagram" as const,
      settingsSchemaKey: "instagram" as const,
    };
  }

  if (platform === "youtube") {
    return {
      composerSettingsKey: "youtube" as const,
      settingsSchemaKey: "youtube" as const,
    };
  }

  if (platform === "pinterest") {
    return {
      composerSettingsKey: "none" as const,
      settingsSchemaKey: "pinterest" as const,
    };
  }

  return {
    composerSettingsKey: "none" as const,
    settingsSchemaKey: "none" as const,
  };
}

function buildEntry(
  platform: Platform,
  connectionMethod: ProviderConnectionMethod,
): ProviderCatalogEntry {
  const settings = settingsKeyFor(platform);

  return {
    identifier: providerIdentifier(connectionMethod, platform),
    platform,
    connectionMethod,
    displayNameKey: `provider.${platform}.${connectionMethod.toLowerCase()}.name`,
    descriptionKey: providerDescriptions[platform],
    status: statusFor(platform, connectionMethod),
    connectMode: connectModeFor(connectionMethod),
    requiredCredentials: requiredCredentials(connectionMethod),
    optionalCredentials: optionalCredentials(connectionMethod),
    supportsTwoStepSelection: platform === "instagram" && connectionMethod === "BYO_OAUTH",
    composerSettingsKey: settings.composerSettingsKey,
    settingsSchemaKey: settings.settingsSchemaKey,
    capabilities: {
      supportsRefresh: connectionMethod === "BYO_OAUTH",
      supportsComments: false,
      supportsMedia: true,
    },
  };
}

export const PROVIDER_CATALOG_ENTRIES: ProviderCatalogEntry[] = [
  ...PLATFORMS.map((platform) => buildEntry(platform, "BYO_OAUTH")),
  ...PLATFORMS.map((platform) => buildEntry(platform, "BYO_SYSTEM_USER")),
  ...PLATFORMS.map((platform) => buildEntry(platform, "LATE")),
];
