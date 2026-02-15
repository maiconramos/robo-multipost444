export type StorageProvider = "VERCEL_BLOB" | "S3_COMPAT" | "CLOUDFLARE_R2" | "URL_ONLY";

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
  upload(file: Buffer, options: UploadOptions): Promise<StoredMedia>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
}
