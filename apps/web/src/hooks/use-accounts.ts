import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CredentialKind, SocialAccountStatus } from "@prisma/client";
import { useCurrentProfileId } from "./use-profiles";
import type { Platform } from "@/lib/platforms/types";

export const accountKeys = {
  all: ["accounts"] as const,
  list: (profileId: string) => ["accounts", "list", profileId] as const,
  health: (profileId: string) => ["accounts", "health", profileId] as const,
  detail: (accountId: string) => ["accounts", "detail", accountId] as const,
};

export interface Account {
  _id: string;
  id: string;
  platform: Platform;
  providerIdentifier: string;
  socialPlatform: string;
  connectionMethod: "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE";
  status: SocialAccountStatus;
  handle: string;
  name?: string;
  meta?: Record<string, unknown>;
  username: string;
  displayName?: string;
  isActive: boolean;
  profilePicture?: string;
  profileId: string;
  providerType?: "late" | "byo";
  credentials?: AccountCredentialSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountCredentialSummary {
  kind: CredentialKind;
  last4?: string | null;
  maskedValue?: string | null;
  expiresAt?: string | null;
  updatedAt?: string;
}

export interface AccountHealth {
  accountId: string;
  isHealthy: boolean;
  status: "healthy" | "unhealthy" | "needs_reconnect" | "inactive";
  error?: string;
}

export interface AccountCredentialInput {
  kind: CredentialKind;
  value: string;
  expiresAt?: string | null;
}

export interface UpdateAccountCredentialInput {
  kind: CredentialKind;
  value?: string;
  expiresAt?: string | null;
  remove?: boolean;
}

export interface CreateAccountInput {
  profileId?: string;
  providerIdentifier?: string;
  platform?: Platform;
  connectionMethod?: "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE";
  handle: string;
  name?: string | null;
  status?: SocialAccountStatus;
  meta?: Record<string, unknown> | null;
  credentials: AccountCredentialInput[];
}

export interface UpdateAccountInput {
  accountId: string;
  profileId?: string;
  providerIdentifier?: string;
  platform?: Platform;
  connectionMethod?: "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE";
  handle?: string;
  name?: string | null;
  status?: SocialAccountStatus;
  meta?: Record<string, unknown> | null;
  credentials?: UpdateAccountCredentialInput[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

/**
 * Hook to fetch all accounts for the current profile
 */
export function useAccounts(profileId?: string) {
  const currentProfileId = useCurrentProfileId();
  const targetProfileId = profileId || currentProfileId;

  return useQuery({
    queryKey: accountKeys.list(targetProfileId || "all"),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (targetProfileId) {
        params.set("profileId", targetProfileId);
      }
      const qs = params.toString();
      return fetchJson<{ accounts: Account[] }>(`/api/accounts${qs ? `?${qs}` : ""}`);
    },
    enabled: true,
  });
}

/**
 * Hook to fetch account health status
 */
export function useAccountsHealth(profileId?: string) {
  const currentProfileId = useCurrentProfileId();
  const targetProfileId = profileId || currentProfileId;

  return useQuery({
    queryKey: accountKeys.health(targetProfileId || "all"),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (targetProfileId) {
        params.set("profileId", targetProfileId);
      }
      return fetchJson<{ accounts: AccountHealth[] }>(
        `/api/accounts/health?${params.toString()}`,
      );
    },
    enabled: true,
  });
}

/**
 * Hook to start OAuth connection flow
 */
export function useConnectAccount() {
  const currentProfileId = useCurrentProfileId();

  return useMutation({
    mutationFn: async ({
      platform,
      providerIdentifier,
      profileId,
      providerType,
      socialAccountId,
    }: {
      platform?: Platform;
      providerIdentifier?: string;
      profileId?: string;
      providerType?: "late" | "byo";
      socialAccountId?: string;
    }) => {
      const targetProfileId = profileId || currentProfileId || "default";

      const data = await fetchJson<{ url: string; state: string; providerType: string }>(
        "/api/accounts/connect",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform,
            providerIdentifier,
            profileId: targetProfileId,
            providerType,
            socialAccountId,
          }),
        },
      );

      return {
        ...data,
        authUrl: data.url,
      };
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      return fetchJson<{ account: Account }>("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, ...input }: UpdateAccountInput) => {
      return fetchJson<{ account: Account }>(`/api/accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountKeys.detail(variables.accountId) });
    },
  });
}

export function useRevealAccountCredential() {
  return useMutation({
    mutationFn: async ({
      accountId,
      kind,
    }: {
      accountId: string;
      kind: CredentialKind;
    }) => {
      return fetchJson<{ kind: CredentialKind; value: string }>(
        `/api/accounts/${accountId}/credentials/reveal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        },
      );
    },
  });
}

/**
 * Hook to delete/disconnect an account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      await fetchJson<{ success: true }>(`/api/accounts/${accountId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

/**
 * Hook to get accounts grouped by platform
 */
export function useAccountsByPlatform(profileId?: string) {
  const { data, ...rest } = useAccounts(profileId);

  const accountsByPlatform = data?.accounts?.reduce(
    (acc: Record<Platform, Account[]>, account: Account) => {
      const platform = account.platform as Platform;
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(account);
      return acc;
    },
    {} as Record<Platform, Account[]>,
  );

  return { data: accountsByPlatform, accounts: data?.accounts, ...rest };
}
