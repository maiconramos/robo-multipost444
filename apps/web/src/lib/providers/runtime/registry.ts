import "server-only";

import { hasPlatformProvider } from "@/lib/providers/byo/registry";
import {
  getProviderCatalogEntry,
  listProviderCatalogEntries,
  normalizeProviderIdentifier,
  toProviderType,
} from "@/lib/providers/catalog";
import type { ProviderRuntimeEntry } from "@/lib/providers/runtime/types";

const runtimeEntries = listProviderCatalogEntries({ status: "active" })
  .filter((entry) => {
    if (entry.connectionMethod === "LATE") {
      return true;
    }

    return hasPlatformProvider(entry.platform);
  })
  .map((entry) => ({
    identifier: entry.identifier,
    platform: entry.platform,
    connectionMethod: entry.connectionMethod,
    providerType: toProviderType(entry.connectionMethod),
  } satisfies ProviderRuntimeEntry));

const runtimeEntryMap = new Map(
  runtimeEntries.map((entry) => [entry.identifier, entry] as const),
);

export function listProviderRuntimeEntries(): ProviderRuntimeEntry[] {
  return runtimeEntries;
}

export function getProviderRuntimeEntry(
  identifier: string | null | undefined,
): ProviderRuntimeEntry | null {
  const normalized = normalizeProviderIdentifier(identifier);
  if (!normalized) {
    return null;
  }

  return runtimeEntryMap.get(normalized) ?? null;
}

export function resolveProviderTypeFromIdentifier(
  identifier: string | null | undefined,
): ProviderRuntimeEntry["providerType"] | null {
  const runtime = getProviderRuntimeEntry(identifier);
  if (runtime) {
    return runtime.providerType;
  }

  const catalogEntry = getProviderCatalogEntry(identifier);
  if (!catalogEntry) {
    return null;
  }

  return toProviderType(catalogEntry.connectionMethod);
}
