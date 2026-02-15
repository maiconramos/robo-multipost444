import type { MediaStorage, StoredMedia, UploadOptions } from "./types";

export class UrlOnlyStorage implements MediaStorage {
  async upload(_: Buffer, options: UploadOptions): Promise<StoredMedia> {
    throw new Error(
      `URL-only storage does not support file uploads for "${options.filename}".`
    );
  }

  async delete(_: string): Promise<void> {
    // No-op: media is hosted outside of this application.
  }

  async getUrl(key: string): Promise<string> {
    return key;
  }
}
