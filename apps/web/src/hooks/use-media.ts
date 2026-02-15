import { useMutation } from "@tanstack/react-query";
import { put } from "@vercel/blob/client";
import {
  getMaxMediaFileSize,
  getMediaTypeFromMimeType,
  getMediaTypeFromUrl,
  getMediaMimeTypeFromUrl,
  isValidMediaMimeType,
  type MediaType,
} from "@/lib/media";
import type { StorageProvider } from "@/lib/storage/types";

export interface UploadedMedia {
  url: string;
  key: string;
  provider: StorageProvider;
  type: MediaType;
  filename: string;
  contentType: string;
  size: number;
}

interface UploadTokenResponse {
  token: string;
  pathname: string;
  provider: Extract<StorageProvider, "VERCEL_BLOB">;
  multipartRecommended: boolean;
  maxSizeBytes: number;
  expiresAt: string;
}

function firstString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function extractUploadErrorMessage(error: unknown): string {
  const fallback = "Failed to upload file";
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const record = error as Record<string, unknown>;
  const cause =
    record.cause && typeof record.cause === "object"
      ? (record.cause as Record<string, unknown>)
      : null;
  const response =
    record.response && typeof record.response === "object"
      ? (record.response as Record<string, unknown>)
      : null;
  const nestedError =
    record.error && typeof record.error === "object"
      ? (record.error as Record<string, unknown>)
      : null;

  const message =
    firstString([
      record.message,
      nestedError?.message,
      cause?.message,
      (cause?.error as Record<string, unknown> | undefined)?.message,
      (response?.error as Record<string, unknown> | undefined)?.message,
      ((response?.data as Record<string, unknown> | undefined)?.error as
        | Record<string, unknown>
        | undefined)?.message,
    ]) ?? fallback;

  if (message.toLowerCase().includes("storage quota exceeded")) {
    return "Storage quota exceeded for current Vercel Blob plan. Upgrade your Blob plan or remove files before uploading new media.";
  }

  return message;
}

interface UploadStrategyResponse {
  provider: string;
  strategy: "direct_client_upload" | "server_upload";
}

interface ServerUploadResponse {
  url: string;
  key: string;
  provider: StorageProvider;
  size: number;
  contentType: string;
  type: string;
  filename: string;
  error?: string;
}

async function detectUploadStrategy(): Promise<UploadStrategyResponse> {
  try {
    const res = await fetch("/api/media/upload");
    if (!res.ok) {
      return { provider: "VERCEL_BLOB", strategy: "direct_client_upload" };
    }
    return (await res.json()) as UploadStrategyResponse;
  } catch {
    return { provider: "VERCEL_BLOB", strategy: "direct_client_upload" };
  }
}

async function uploadViaServer(
  file: File,
  folder: string,
): Promise<ServerUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await res.json().catch(() => ({}))) as ServerUploadResponse;
  if (!res.ok) {
    throw new Error(payload.error || "Failed to upload file");
  }

  return payload;
}

/**
 * Hook to upload media. Detects the storage provider and uses
 * token-based direct upload for Vercel Blob or server-side upload
 * for Cloudflare R2 and S3-compatible providers.
 */
export function useUploadMedia() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadedMedia> => {
      if (!isValidMediaType(file)) {
        throw new Error("Invalid file type");
      }

      const mediaType = getMediaType(file.type);
      const maxSize = getMaxFileSize(mediaType);
      if (file.size > maxSize) {
        throw new Error(
          `File too large. Max size for ${mediaType} is ${Math.floor(
            maxSize / (1024 * 1024)
          )}MB.`
        );
      }

      const { strategy } = await detectUploadStrategy();

      if (strategy === "server_upload") {
        const result = await uploadViaServer(file, "posts");

        return {
          url: result.url,
          key: result.key,
          provider: result.provider,
          type: mediaType,
          filename: file.name,
          contentType:
            result.contentType || file.type || "application/octet-stream",
          size: result.size || file.size,
        };
      }

      const tokenResponse = await fetch("/api/media/upload-token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          folder: "posts",
        }),
      });

      const tokenPayload = (await tokenResponse.json().catch(
        () => ({}),
      )) as Partial<UploadTokenResponse> & { error?: string };
      if (!tokenResponse.ok) {
        throw new Error(
          typeof tokenPayload.error === "string"
            ? tokenPayload.error
            : "Failed to upload file"
        );
      }

      if (!tokenPayload.token || !tokenPayload.pathname) {
        throw new Error("Upload token response is invalid.");
      }

      let blob;
      try {
        blob = await put(tokenPayload.pathname, file, {
          access: "public",
          token: tokenPayload.token,
          contentType: file.type || "application/octet-stream",
          multipart: tokenPayload.multipartRecommended ?? false,
        });
      } catch (error) {
        const message = extractUploadErrorMessage(error);
        console.error("Direct media upload failed", {
          message,
          filename: file.name,
          size: file.size,
          contentType: file.type,
        });
        throw new Error(message);
      }

      return {
        url: blob.url,
        key: blob.url,
        provider: tokenPayload.provider || "VERCEL_BLOB",
        type: mediaType,
        filename: file.name,
        contentType: file.type || blob.contentType || "application/octet-stream",
        size: file.size,
      };
    },
  });
}

/**
 * Hook to upload multiple files
 */
export function useUploadMultipleMedia() {
  const uploadMutation = useUploadMedia();

  return useMutation({
    mutationFn: async (files: File[]): Promise<UploadedMedia[]> => {
      const results = await Promise.all(
        files.map((file) => uploadMutation.mutateAsync(file))
      );
      return results;
    },
  });
}

/**
 * Utility to get file type from MIME type
 */
export function getMediaType(mimeType: string): MediaType {
  return getMediaTypeFromMimeType(mimeType) || "image";
}

/**
 * Utility to validate file type
 */
export function isValidMediaType(file: File): boolean {
  return isValidMediaMimeType(file.type);
}

/**
 * Utility to get max file size by type (in bytes)
 */
export function getMaxFileSize(type: MediaType): number {
  return getMaxMediaFileSize(type);
}

export function getMediaTypeByUrl(url: string): MediaType {
  return getMediaTypeFromUrl(url);
}

export function getMediaMimeTypeByUrl(url: string): string | null {
  return getMediaMimeTypeFromUrl(url);
}
