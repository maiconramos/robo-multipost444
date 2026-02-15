export type MediaType = "image" | "video";

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
] as const;

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

const VALID_MEDIA_MIME_TYPES = new Set<string>([
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
]);

const VIDEO_URL_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm", ".m4v"] as const;

const IMAGE_URL_EXTENSION_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
} as const;

const VIDEO_URL_EXTENSION_TO_MIME = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
} as const;

const URL_EXTENSION_TO_MIME = {
  ...IMAGE_URL_EXTENSION_TO_MIME,
  ...VIDEO_URL_EXTENSION_TO_MIME,
} as const;

function getUrlPathname(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function getMediaTypeFromMimeType(mimeType: string): MediaType | null {
  if (IMAGE_MIME_TYPES.includes(mimeType as (typeof IMAGE_MIME_TYPES)[number])) return "image";
  if (VIDEO_MIME_TYPES.includes(mimeType as (typeof VIDEO_MIME_TYPES)[number])) return "video";
  return null;
}

export function isValidMediaMimeType(mimeType: string): boolean {
  return VALID_MEDIA_MIME_TYPES.has(mimeType);
}

export function getMaxMediaFileSize(type: MediaType): number {
  return type === "video" ? MAX_VIDEO_FILE_SIZE_BYTES : MAX_IMAGE_FILE_SIZE_BYTES;
}

export function getMediaTypeFromUrl(url: string): MediaType {
  const lowerPathname = getUrlPathname(url);
  return VIDEO_URL_EXTENSIONS.some((ext) => lowerPathname.includes(ext)) ? "video" : "image";
}

export function getMediaMimeTypeFromUrl(url: string): string | null {
  const pathname = getUrlPathname(url);
  for (const [extension, mimeType] of Object.entries(URL_EXTENSION_TO_MIME)) {
    if (pathname.endsWith(extension)) return mimeType;
  }
  return null;
}
