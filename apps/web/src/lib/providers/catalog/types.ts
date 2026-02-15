import type { Platform } from "@/lib/platforms/types";

export type ProviderConnectionMethod =
  | "BYO_OAUTH"
  | "BYO_SYSTEM_USER"
  | "LATE";

export type ProviderCredentialKind =
  | "APP_ID"
  | "APP_SECRET"
  | "ACCESS_TOKEN"
  | "REFRESH_TOKEN"
  | "SYSTEM_USER_TOKEN"
  | "LATE_API_KEY";

export type ProviderStatus = "active" | "coming_soon";

export type ProviderConnectMode = "oauth" | "custom_fields" | "external_url";

export type ComposerSettingsKey = "instagram" | "youtube" | "none";

export type SettingsSchemaKey = "instagram" | "youtube" | "pinterest" | "none";

export interface ProviderCapabilities {
  supportsRefresh: boolean;
  supportsComments: boolean;
  supportsMedia: boolean;
}

export interface ProviderCatalogEntry {
  identifier: string;
  platform: Platform;
  connectionMethod: ProviderConnectionMethod;
  displayNameKey: string;
  descriptionKey: string;
  status: ProviderStatus;
  connectMode: ProviderConnectMode;
  requiredCredentials: ProviderCredentialKind[];
  optionalCredentials: ProviderCredentialKind[];
  supportsTwoStepSelection: boolean;
  composerSettingsKey: ComposerSettingsKey;
  settingsSchemaKey: SettingsSchemaKey;
  capabilities: ProviderCapabilities;
}

export type ProviderType = "late" | "byo";
