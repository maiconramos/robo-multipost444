import { getStorageProvider } from "@/lib/storage";
import type { StorageProvider } from "@/lib/storage/types";

const ONE_GIBIBYTE = 1024 ** 3;

export interface StoragePlanConfig {
  provider: StorageProvider;
  planName: string;
  quotaGb: number | null;
  quotaBytes: number | null;
  isQuotaFallback: boolean;
}

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function getDefaultPlanName(provider: StorageProvider): string {
  switch (provider) {
    case "VERCEL_BLOB":
      return "Hobby";
    case "S3_COMPAT":
      return "S3 Compatible";
    case "CLOUDFLARE_R2":
      return "Cloudflare R2 Free";
    case "URL_ONLY":
      return "URL Only";
    default:
      return "Custom";
  }
}

export function convertGigabytesToBytes(gigabytes: number): number {
  return Math.round(gigabytes * ONE_GIBIBYTE);
}

export function resolveStoragePlanConfig(): StoragePlanConfig {
  const provider = getStorageProvider();
  const envPlanName = process.env.STORAGE_PLAN_NAME?.trim();
  const envQuotaGb = parsePositiveNumber(process.env.STORAGE_QUOTA_GB);

  const planName = envPlanName || getDefaultPlanName(provider);

  if (provider === "VERCEL_BLOB") {
    const quotaGb = envQuotaGb ?? 1;

    return {
      provider,
      planName,
      quotaGb,
      quotaBytes: convertGigabytesToBytes(quotaGb),
      isQuotaFallback: envQuotaGb == null,
    };
  }

  if (provider === "CLOUDFLARE_R2") {
    const quotaGb = envQuotaGb ?? 10;

    return {
      provider,
      planName,
      quotaGb,
      quotaBytes: convertGigabytesToBytes(quotaGb),
      isQuotaFallback: envQuotaGb == null,
    };
  }

  return {
    provider,
    planName,
    quotaGb: envQuotaGb,
    quotaBytes:
      envQuotaGb == null ? null : convertGigabytesToBytes(envQuotaGb),
    isQuotaFallback: false,
  };
}
