import type { StorageProvider, StoragePlanConfig } from "./types";

const ONE_GIBIBYTE = 1024 ** 3;

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function getDefaultPlanName(provider: StorageProvider): string {
  switch (provider) {
    case "R2":
      return "Cloudflare R2";
    case "VERCEL_BLOB":
      return "Hobby";
    case "S3_COMPAT":
      return "S3 Compatible";
    case "URL_ONLY":
      return "URL Only";
    default:
      return "Custom";
  }
}

export function convertGigabytesToBytes(gigabytes: number): number {
  return Math.round(gigabytes * ONE_GIBIBYTE);
}

export function resolveStoragePlanConfig(params: {
  provider: StorageProvider;
  planName?: string;
  quotaGb?: string;
}): StoragePlanConfig {
  const { provider } = params;
  const envPlanName = params.planName?.trim();
  const envQuotaGb = parsePositiveNumber(params.quotaGb);

  const planName = envPlanName || getDefaultPlanName(provider);

  // R2 free tier: 10 GB/month storage
  if (provider === "R2") {
    const quotaGb = envQuotaGb ?? 10;
    return {
      provider,
      planName,
      quotaGb,
      quotaBytes: convertGigabytesToBytes(quotaGb),
      isQuotaFallback: envQuotaGb == null,
    };
  }

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

  return {
    provider,
    planName,
    quotaGb: envQuotaGb,
    quotaBytes: envQuotaGb == null ? null : convertGigabytesToBytes(envQuotaGb),
    isQuotaFallback: false,
  };
}
