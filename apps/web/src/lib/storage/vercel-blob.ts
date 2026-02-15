import { del, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import type { MediaStorage, StoredMedia, UploadOptions } from "./types";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export class VercelBlobStorage implements MediaStorage {
  async upload(file: Buffer, options: UploadOptions): Promise<StoredMedia> {
    const folder = options.folder || "media";
    const pathname = [
      options.workspaceId,
      folder,
      `${Date.now()}-${randomUUID()}-${sanitizeFilename(options.filename)}`,
    ].join("/");

    const blob = await put(pathname, file, {
      access: "public",
      contentType: options.contentType,
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      key: blob.url,
      provider: "VERCEL_BLOB",
      size: file.length,
      contentType: options.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }

  async getUrl(key: string): Promise<string> {
    return key;
  }
}
