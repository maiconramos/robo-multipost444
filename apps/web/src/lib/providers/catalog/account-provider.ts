import type { Platform } from "@/lib/platforms/types";
import {
  resolveProviderCatalogEntry,
  toProviderType,
} from "@/lib/providers/catalog";
import type {
  ProviderCatalogEntry,
  ProviderConnectionMethod,
  ProviderCredentialKind,
  ProviderType,
} from "@/lib/providers/catalog/types";

export interface ResolveProviderFromPayloadInput {
  providerIdentifier?: string | null;
  platform?: string | null;
  connectionMethod?: string | null;
  providerType?: ProviderType | null;
  onlyActive?: boolean;
}

export function resolveProviderFromPayload(
  params: ResolveProviderFromPayloadInput,
): ProviderCatalogEntry | null {
  return resolveProviderCatalogEntry({
    providerIdentifier: params.providerIdentifier,
    platform: params.platform,
    connectionMethod: params.connectionMethod,
    providerType: params.providerType,
    onlyActive: params.onlyActive,
  });
}

export function providerTypeFromEntry(entry: ProviderCatalogEntry): ProviderType {
  return toProviderType(entry.connectionMethod);
}

export function requiredCredentialKindsFromEntry(
  entry: ProviderCatalogEntry,
): ProviderCredentialKind[] {
  return entry.requiredCredentials;
}

export function optionalCredentialKindsFromEntry(
  entry: ProviderCatalogEntry,
): ProviderCredentialKind[] {
  return entry.optionalCredentials;
}

export function supportsOAuthFromEntry(entry: ProviderCatalogEntry): boolean {
  return (
    entry.connectionMethod === "BYO_OAUTH" &&
    entry.connectMode === "oauth"
  );
}

export function toPlatformFromEntry(entry: ProviderCatalogEntry): Platform {
  return entry.platform;
}

export function toConnectionMethodFromEntry(
  entry: ProviderCatalogEntry,
): ProviderConnectionMethod {
  return entry.connectionMethod;
}
