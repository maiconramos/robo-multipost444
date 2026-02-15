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
    throw new Error(`${name} is required for S3_COMPAT storage`);
  }
  return value;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getDefaultPublicUrl(bucket: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl) {
    return trimTrailingSlash(publicUrl);
  }

  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint) {
    return `${trimTrailingSlash(endpoint)}/${bucket}`;
  }

  const region = process.env.S3_REGION || "us-east-1";
  if (region === "us-east-1") {
    return `https://${bucket}.s3.amazonaws.com`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

export class S3Storage implements MediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = getRequiredEnv("S3_BUCKET");
    this.publicUrl = getDefaultPublicUrl(this.bucket);

    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: getRequiredEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: getRequiredEnv("S3_SECRET_ACCESS_KEY"),
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
      })
    );

    return {
      url: `${this.publicUrl}/${key}`,
      key,
      provider: "S3_COMPAT",
      size: file.length,
      contentType: options.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async getUrl(key: string): Promise<string> {
    return `${this.publicUrl}/${key}`;
  }
}
