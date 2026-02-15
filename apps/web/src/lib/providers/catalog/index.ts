import { PLATFORMS, type Platform } from "@/lib/platforms/types";
import { PROVIDER_CATALOG_ENTRIES } from "@/lib/providers/catalog/entries";
import type {
  ProviderCatalogEntry,
  ProviderConnectionMethod,
  ProviderStatus,
  ProviderType,
} from "@/lib/providers/catalog/types";

const providerCatalogMap = new Map(
  PROVIDER_CATALOG_ENTRIES.map((entry) => [entry.identifier, entry] as const),
);

export { PROVIDER_CATALOG_ENTRIES };

export function toProviderType(
  connectionMethod: ProviderConnectionMethod,
): ProviderType {
  return connectionMethod === "LATE" ? "late" : "byo";
}

export function toProviderIdentifier(
  connectionMethod: ProviderConnectionMethod,
  platform: Platform,
): string {
  return `${connectionMethod.toLowerCase()}.${platform}`;
}

function parsePlatform(input: string | null | undefined): Platform | null {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();
  if ((PLATFORMS as readonly string[]).includes(normalized)) {
    return normalized as Platform;
  }

  return null;
}

function parseConnectionMethod(
  input: string | null | undefined,
): ProviderConnectionMethod | null {
  const normalized = input?.trim().toUpperCase();
  if (
    normalized === "BYO_OAUTH" ||
    normalized === "BYO_SYSTEM_USER" ||
    normalized === "LATE"
  ) {
    return normalized;
  }

  return null;
}

export function normalizeProviderIdentifier(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (providerCatalogMap.has(normalized)) {
    return normalized;
  }

  const aliasMatch = normalized.match(/^byo\.(.+)\.(oauth|system_user)$/);
  if (aliasMatch) {
    const platform = parsePlatform(aliasMatch[1]);
    const method =
      aliasMatch[2] === "oauth"
        ? "BYO_OAUTH"
        : ("BYO_SYSTEM_USER" as const);
    if (platform) {
      const canonical = toProviderIdentifier(method, platform);
      if (providerCatalogMap.has(canonical)) {
        return canonical;
      }
    }
  }

  return null;
}

export function getProviderCatalogEntry(
  identifier: string | null | undefined,
): ProviderCatalogEntry | null {
  const normalized = normalizeProviderIdentifier(identifier);
  if (!normalized) {
    return null;
  }

  return providerCatalogMap.get(normalized) ?? null;
}

export function listProviderCatalogEntries(options?: {
  status?: ProviderStatus | "all";
}): ProviderCatalogEntry[] {
  const status = options?.status ?? "all";
  if (status === "all") {
    return PROVIDER_CATALOG_ENTRIES;
  }

  return PROVIDER_CATALOG_ENTRIES.filter((entry) => entry.status === status);
}

export function listProviderCatalogByPlatform(platform: Platform): ProviderCatalogEntry[] {
  return PROVIDER_CATALOG_ENTRIES.filter((entry) => entry.platform === platform);
}

export function getProviderCatalogEntryByPlatformAndMethod(params: {
  platform: string | null | undefined;
  connectionMethod: string | null | undefined;
}): ProviderCatalogEntry | null {
  const platform = parsePlatform(params.platform);
  const connectionMethod = parseConnectionMethod(params.connectionMethod);
  if (!platform || !connectionMethod) {
    return null;
  }

  return getProviderCatalogEntry(toProviderIdentifier(connectionMethod, platform));
}

export function resolveProviderCatalogEntry(params: {
  providerIdentifier?: string | null;
  platform?: string | null;
  connectionMethod?: string | null;
  providerType?: ProviderType | null;
  onlyActive?: boolean;
}): ProviderCatalogEntry | null {
  const direct = getProviderCatalogEntry(params.providerIdentifier);
  if (direct) {
    if (params.onlyActive && direct.status !== "active") {
      return null;
    }

    return direct;
  }

  const platform = parsePlatform(params.platform);
  if (!platform) {
    return null;
  }

  const explicitMethod = parseConnectionMethod(params.connectionMethod);
  if (explicitMethod) {
    const entry = getProviderCatalogEntry(
      toProviderIdentifier(explicitMethod, platform),
    );

    if (!entry) {
      return null;
    }

    if (params.onlyActive && entry.status !== "active") {
      return null;
    }

    return entry;
  }

  const preferredMethods: ProviderConnectionMethod[] =
    params.providerType === "late"
      ? ["LATE"]
      : params.providerType === "byo"
        ? ["BYO_OAUTH", "BYO_SYSTEM_USER"]
        : ["BYO_OAUTH", "BYO_SYSTEM_USER", "LATE"];

  for (const method of preferredMethods) {
    const candidate = getProviderCatalogEntry(
      toProviderIdentifier(method, platform),
    );

    if (!candidate) {
      continue;
    }

    if (params.onlyActive && candidate.status !== "active") {
      continue;
    }

    return candidate;
  }

  return null;
}
