import type { CredentialKind } from "@prisma/client";
import { decrypt, encrypt } from "@/lib/encryption";

export const ACCOUNT_CREDENTIAL_KINDS: CredentialKind[] = [
  "APP_ID",
  "APP_SECRET",
  "ACCESS_TOKEN",
  "REFRESH_TOKEN",
  "SYSTEM_USER_TOKEN",
  "LATE_API_KEY",
];

export function maskSecret(value: string): { maskedValue: string; last4: string } {
  const trimmed = value.trim();
  const last4 = trimmed.slice(-4);
  return {
    maskedValue: `••••••••${last4}`,
    last4,
  };
}

export function encryptAccountSecret(value: string): {
  encryptedValue: string;
  last4: string;
  maskedValue: string;
} {
  const normalized = value.trim();
  const { last4, maskedValue } = maskSecret(normalized);
  return {
    encryptedValue: encrypt(normalized),
    last4,
    maskedValue,
  };
}

export function decryptAccountSecret(encryptedValue: string): string {
  return decrypt(encryptedValue);
}
