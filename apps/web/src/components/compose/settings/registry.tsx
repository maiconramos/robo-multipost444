"use client";

import type { ReactNode } from "react";
import type { Account, UploadedMedia } from "@/hooks";
import type { Platform, PlatformSpecificData } from "@/lib/platforms/types";
import { getProviderCatalogEntry } from "@/lib/providers/catalog";
import type { ComposerSettingsKey } from "@/lib/providers/catalog/types";
import { InstagramSettings } from "@/components/compose/settings/providers/instagram-settings";
import { NoExtraSettings } from "@/components/compose/settings/providers/no-extra-settings";
import { YouTubeSettings } from "@/components/compose/settings/providers/youtube-settings";

export interface SettingsProviderProps {
  account: Account;
  media: UploadedMedia[];
  value: PlatformSpecificData | undefined;
  onChange: (value: PlatformSpecificData | undefined) => void;
  errors: string[];
  storageProvider?: string | null;
}

export type SettingsProviderComponent = (
  props: SettingsProviderProps,
) => ReactNode;

const settingsRegistry: Record<ComposerSettingsKey, SettingsProviderComponent> = {
  instagram: InstagramSettings,
  youtube: YouTubeSettings,
  none: NoExtraSettings,
};

export function getSettingsProviderComponent(
  providerIdentifier: string | undefined,
  fallbackPlatform: Platform,
): SettingsProviderComponent {
  const providerEntry = getProviderCatalogEntry(providerIdentifier);
  if (providerEntry) {
    return settingsRegistry[providerEntry.composerSettingsKey];
  }

  if (fallbackPlatform === "instagram") {
    return settingsRegistry.instagram;
  }

  if (fallbackPlatform === "youtube") {
    return settingsRegistry.youtube;
  }

  return settingsRegistry.none;
}

export function hasSpecificSettingsProvider(
  providerIdentifier: string | undefined,
  fallbackPlatform: Platform,
): boolean {
  const providerEntry = getProviderCatalogEntry(providerIdentifier);
  if (providerEntry) {
    return providerEntry.composerSettingsKey !== "none";
  }

  return fallbackPlatform === "instagram" || fallbackPlatform === "youtube";
}
