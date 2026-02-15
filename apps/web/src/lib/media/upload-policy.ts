import {
  getMaxMediaFileSize,
  getMediaTypeFromMimeType,
  isValidMediaMimeType,
  type MediaType,
} from "@/lib/media";

export const MULTIPART_RECOMMENDED_SIZE_BYTES = 100 * 1024 * 1024;

export interface UploadPolicyInput {
  contentType: string;
  size: number;
}

export interface UploadPolicyResult {
  normalizedContentType: string;
  mediaType: MediaType;
  maxSizeBytes: number;
  multipartRecommended: boolean;
}

export class UploadPolicyError extends Error {}

export function normalizeMimeType(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return value.split(";")[0]?.trim().toLowerCase() || "";
}

export function getUploadPolicy(input: UploadPolicyInput): UploadPolicyResult {
  const normalizedContentType = normalizeMimeType(input.contentType);

  if (!isValidMediaMimeType(normalizedContentType)) {
    throw new UploadPolicyError(
      "Invalid file type. Upload an image or video format supported by the app.",
    );
  }

  const mediaType = getMediaTypeFromMimeType(normalizedContentType);
  if (!mediaType) {
    throw new UploadPolicyError("Invalid media type");
  }

  const maxSizeBytes = getMaxMediaFileSize(mediaType);
  if (input.size > maxSizeBytes) {
    throw new UploadPolicyError(
      `File too large. Max size for ${mediaType} is ${Math.floor(maxSizeBytes / (1024 * 1024))}MB.`,
    );
  }

  return {
    normalizedContentType,
    mediaType,
    maxSizeBytes,
    multipartRecommended: input.size >= MULTIPART_RECOMMENDED_SIZE_BYTES,
  };
}
