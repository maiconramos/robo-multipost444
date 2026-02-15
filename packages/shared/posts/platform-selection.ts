import type { Platform } from "../types/platforms";
import { PLATFORMS } from "../types/platforms";
import { getProviderCatalogEntry } from "../providers/catalog";
import type { SettingsSchemaKey } from "../providers/catalog/types";
import {
  connectionMethodToLegacyProviderType,
  fromSocialPlatform,
} from "../social-accounts";
import type { SocialPlatform, ConnectionMethod } from "../social-accounts";
import type {
  ValidationIssue,
  ValidationResult,
} from "./platform-settings-schema";

export interface PlatformSelectionDb {
  findSocialAccounts(params: { workspaceId: string; accountIds: string[] }): Promise<Array<{
    id: string;
    profileId: string;
    platform: SocialPlatform;
    providerIdentifier: string;
    connectionMethod: ConnectionMethod;
    status: string;
  }>>;
}

export interface RequestedPlatformSelection {
  accountId: string;
  platform: string;
  customContent?: string;
  platformSpecificData?: unknown;
}

export interface ResolvedPlatformSelection {
  accountId: string;
  platform: Platform;
  providerIdentifier: string;
  settingsSchemaKey: SettingsSchemaKey;
  profileId: string;
  connectionMethod: ConnectionMethod;
  customContent?: string;
  platformSpecificData?: unknown;
}

export interface ResolvedPlatformSelectionContext {
  profileId: string;
  primaryAccountId: string;
  primaryProviderType: "late" | "byo";
  selections: ResolvedPlatformSelection[];
}

function parsePlatform(input: string): Platform | null {
  const normalized = input.trim().toLowerCase();
  if ((PLATFORMS as readonly string[]).includes(normalized)) {
    return normalized as Platform;
  }
  return null;
}

function pushIssue(issues: ValidationIssue[], issue: ValidationIssue): void {
  issues.push(issue);
}

export async function resolvePlatformSelections(params: {
  db: PlatformSelectionDb;
  workspaceId: string;
  platforms: RequestedPlatformSelection[];
}): Promise<ValidationResult<ResolvedPlatformSelectionContext>> {
  const issues: ValidationIssue[] = [];

  if (params.platforms.length === 0) {
    return {
      ok: false,
      error: "At least one platform selection is required.",
      issues: [{ path: "platforms", message: "At least one platform selection is required." }],
    };
  }

  const accountIdMap = new Map<string, number>();
  params.platforms.forEach((entry, index) => {
    const existingIndex = accountIdMap.get(entry.accountId);
    if (existingIndex !== undefined) {
      pushIssue(issues, {
        path: `platforms.${index}.accountId`,
        message: "Duplicate accountId in platforms payload.",
        accountId: entry.accountId,
      });
    } else {
      accountIdMap.set(entry.accountId, index);
    }

    if (!parsePlatform(entry.platform)) {
      pushIssue(issues, {
        path: `platforms.${index}.platform`,
        message: "Unsupported platform in platforms payload.",
        accountId: entry.accountId,
      });
    }
  });

  if (issues.length > 0) {
    return {
      ok: false,
      error: issues[0]?.message ?? "Invalid platform selection",
      issues,
    };
  }

  const accountIds = params.platforms.map((entry) => entry.accountId);
  const accounts = await params.db.findSocialAccounts({
    workspaceId: params.workspaceId,
    accountIds,
  });

  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  params.platforms.forEach((entry, index) => {
    const account = accountMap.get(entry.accountId);
    if (!account) {
      pushIssue(issues, {
        path: `platforms.${index}.accountId`,
        message: "Selected account is invalid.",
        accountId: entry.accountId,
      });
      return;
    }

    if (account.status !== "CONNECTED") {
      pushIssue(issues, {
        path: `platforms.${index}.accountId`,
        message: "Selected account is not connected.",
        accountId: entry.accountId,
      });
    }

    const resolvedPlatform = fromSocialPlatform(account.platform);
    const requestedPlatform = parsePlatform(entry.platform);
    if (requestedPlatform && requestedPlatform !== resolvedPlatform) {
      pushIssue(issues, {
        path: `platforms.${index}.platform`,
        message: "Platform does not match selected account.",
        accountId: entry.accountId,
        platform: resolvedPlatform,
      });
    }

    const providerEntry = getProviderCatalogEntry(account.providerIdentifier);
    if (!providerEntry) {
      pushIssue(issues, {
        path: `platforms.${index}.accountId`,
        message: "Account provider is invalid or unsupported.",
        accountId: entry.accountId,
        platform: resolvedPlatform,
      });
      return;
    }

    if (providerEntry.platform !== resolvedPlatform) {
      pushIssue(issues, {
        path: `platforms.${index}.accountId`,
        message: "Account provider does not match account platform.",
        accountId: entry.accountId,
        platform: resolvedPlatform,
      });
    }
  });

  const uniqueProfileIds = new Set(accounts.map((account) => account.profileId));
  if (uniqueProfileIds.size > 1) {
    pushIssue(issues, {
      path: "platforms",
      message: "All selected accounts must belong to the same profile.",
    });
  }

  if (issues.length > 0) {
    return {
      ok: false,
      error: issues[0]?.message ?? "Invalid platform selection",
      issues,
    };
  }

  const resolvedSelections = params.platforms.map((entry) => {
    const account = accountMap.get(entry.accountId)!;
    const providerEntry = getProviderCatalogEntry(account.providerIdentifier);

    return {
      accountId: account.id,
      platform: fromSocialPlatform(account.platform),
      providerIdentifier: account.providerIdentifier,
      settingsSchemaKey: providerEntry?.settingsSchemaKey ?? "none",
      profileId: account.profileId,
      connectionMethod: account.connectionMethod,
      customContent: entry.customContent,
      platformSpecificData: entry.platformSpecificData,
    } satisfies ResolvedPlatformSelection;
  });

  const primary = resolvedSelections[0];

  return {
    ok: true,
    data: {
      profileId: primary.profileId,
      primaryAccountId: primary.accountId,
      primaryProviderType: connectionMethodToLegacyProviderType(
        primary.connectionMethod,
      ),
      selections: resolvedSelections,
    },
  };
}
