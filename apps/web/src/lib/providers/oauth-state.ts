import type { Platform } from "@/lib/platforms/types";

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export interface OAuthStateEntry {
  state: string;
  platform: Platform;
  providerIdentifier: string;
  profileId: string;
  workspaceId: string;
  socialAccountId?: string;
  providerType: "late" | "byo";
  redirectUrl: string;
  codeVerifier?: string;
  createdAt: number;
}

export function decodeOAuthStateCookie(rawValue: string | undefined): OAuthStateEntry[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(Buffer.from(rawValue, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry: unknown) => isOAuthStateEntry(entry));
  } catch {
    return [];
  }
}

export function encodeOAuthStateCookie(entries: OAuthStateEntry[]): string {
  return Buffer.from(JSON.stringify(entries), "utf8").toString("base64url");
}

export function addOAuthStateEntry(
  entries: OAuthStateEntry[],
  entry: OAuthStateEntry,
): OAuthStateEntry[] {
  const cutoff = Date.now() - OAUTH_STATE_TTL_SECONDS * 1000;

  const filtered = entries
    .filter((existing) => existing.createdAt >= cutoff)
    .filter((existing) => existing.state !== entry.state);

  return [...filtered, entry].slice(-20);
}

export function consumeOAuthStateEntry(
  entries: OAuthStateEntry[],
  state: string,
): { entry?: OAuthStateEntry; remaining: OAuthStateEntry[] } {
  const index = entries.findIndex((entry) => entry.state === state);
  if (index === -1) {
    return { remaining: entries };
  }

  const entry = entries[index];
  const remaining = entries.filter((_, i) => i !== index);
  return { entry, remaining };
}

function isOAuthStateEntry(value: unknown): value is OAuthStateEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.state === "string" &&
    typeof entry.platform === "string" &&
    typeof entry.providerIdentifier === "string" &&
    typeof entry.profileId === "string" &&
    typeof entry.workspaceId === "string" &&
    (entry.socialAccountId === undefined || typeof entry.socialAccountId === "string") &&
    (entry.providerType === "late" || entry.providerType === "byo") &&
    typeof entry.redirectUrl === "string" &&
    typeof entry.createdAt === "number"
  );
}
