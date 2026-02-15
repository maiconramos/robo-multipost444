import { CloudflareR2Storage } from "./cloudflare-r2-storage";
import { S3Storage } from "./s3-storage";
import type { MediaStorage, StorageProvider } from "./types";
import { UrlOnlyStorage } from "./url-only";
import { VercelBlobStorage } from "./vercel-blob";

const DEFAULT_STORAGE_PROVIDER: StorageProvider = "CLOUDFLARE_R2";

function normalizeStorageProvider(value?: string | null): StorageProvider {
  const provider = value?.toUpperCase();

  if (
    provider === "VERCEL_BLOB" ||
    provider === "S3_COMPAT" ||
    provider === "CLOUDFLARE_R2" ||
    provider === "URL_ONLY"
  ) {
    return provider;
  }

  if (!provider) {
    return DEFAULT_STORAGE_PROVIDER;
  }

  throw new Error(`Unknown storage provider: ${value}`);
}

export function getStorage(provider?: string): MediaStorage {
  const resolvedProvider = normalizeStorageProvider(
    provider || process.env.STORAGE_PROVIDER
  );

  switch (resolvedProvider) {
    case "VERCEL_BLOB":
      return new VercelBlobStorage();
    case "S3_COMPAT":
      return new S3Storage();
    case "CLOUDFLARE_R2":
      return new CloudflareR2Storage();
    case "URL_ONLY":
      return new UrlOnlyStorage();
    default:
      return new CloudflareR2Storage();
  }
}

export function getStorageByProvider(
  provider?: string | null
): MediaStorage | null {
  if (!provider) {
    return null;
  }

  try {
    return getStorage(provider);
  } catch {
    return null;
  }
}

export function getStorageProvider(): StorageProvider {
  return normalizeStorageProvider(process.env.STORAGE_PROVIDER);
}
