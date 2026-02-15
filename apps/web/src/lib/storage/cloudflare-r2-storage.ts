import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import type { MediaStorage, StoredMedia, UploadOptions } from "./types";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for CLOUDFLARE_R2 storage`);
  }
  return value;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export interface R2BucketUsage {
  payloadSize: number;
  metadataSize: number;
  objectCount: number;
  uploadCount: number;
}

export class CloudflareR2Storage implements MediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const accountId = getRequiredEnv("CF_ACCOUNT_ID");
    this.bucket = getRequiredEnv("R2_BUCKET");

    const publicUrl = process.env.R2_PUBLIC_URL;
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.publicUrl = publicUrl
      ? trimTrailingSlash(publicUrl)
      : `${endpoint}/${this.bucket}`;

    this.client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  async upload(file: Buffer, options: UploadOptions): Promise<StoredMedia> {
    const folder = options.folder || "media";
    const key = [
      options.workspaceId,
      folder,
      `${Date.now()}-${randomUUID()}-${sanitizeFilename(options.filename)}`,
    ].join("/");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: options.contentType,
      }),
    );

    return {
      url: `${this.publicUrl}/${key}`,
      key,
      provider: "CLOUDFLARE_R2",
      size: file.length,
      contentType: options.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getUrl(key: string): Promise<string> {
    return `${this.publicUrl}/${key}`;
  }

  /**
   * Queries Cloudflare R2 REST API for bucket usage metrics.
   * Requires CF_ACCOUNT_ID and CF_API_TOKEN environment variables.
   * Returns payload size, metadata size, object count, and upload count.
   */
  static async getBucketUsage(): Promise<R2BucketUsage> {
    const accountId = getRequiredEnv("CF_ACCOUNT_ID");
    const apiToken = getRequiredEnv("CF_API_TOKEN");
    const bucket = getRequiredEnv("R2_BUCKET");

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/usage`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Cloudflare R2 usage API returned ${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as {
      success: boolean;
      result: {
        payloadSize: number;
        metadataSize: number;
        objectCount: number;
        uploadCount: number;
      };
      errors?: Array<{ message: string }>;
    };

    if (!data.success) {
      const errorMsg =
        data.errors?.map((e) => e.message).join("; ") ?? "Unknown error";
      throw new Error(`Cloudflare R2 usage API error: ${errorMsg}`);
    }

    return {
      payloadSize: data.result.payloadSize,
      metadataSize: data.result.metadataSize,
      objectCount: data.result.objectCount,
      uploadCount: data.result.uploadCount,
    };
  }
}
