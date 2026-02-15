export type StorageProvider = "R2" | "S3_COMPAT" | "VERCEL_BLOB" | "URL_ONLY";

export interface UploadOptions {
  filename: string;
  contentType: string;
  workspaceId: string;
  folder?: string;
}

export interface StoredMedia {
  url: string;
  key: string;
  provider: StorageProvider;
  size: number;
  contentType: string;
}

export interface MediaStorage {
  upload(file: ArrayBuffer | ReadableStream, options: UploadOptions): Promise<StoredMedia>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}

export interface StoragePlanConfig {
  provider: StorageProvider;
  planName: string;
  quotaGb: number | null;
  quotaBytes: number | null;
  isQuotaFallback: boolean;
}
