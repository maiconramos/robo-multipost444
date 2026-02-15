import { z } from "zod";
import type {
  InstagramPlatformData,
  PinterestPlatformData,
  Platform,
  PlatformMediaReference,
  PlatformSpecificData,
  YouTubePlatformData,
} from "../types/platforms";
import type { SettingsSchemaKey } from "../providers/catalog/types";

const storageProviderSchema = z.enum([
  "VERCEL_BLOB",
  "S3_COMPAT",
  "URL_ONLY",
  "late",
]);

const mediaReferenceSchema = z.object({
  url: z.string().trim().url(),
  key: z.string().trim().min(1).optional(),
  provider: storageProviderSchema.optional(),
  filename: z.string().trim().min(1).optional(),
  contentType: z.string().trim().min(1).optional(),
  size: z.number().int().nonnegative().optional(),
});

export const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().trim().url(),
  key: z.string().trim().min(1).optional(),
  provider: storageProviderSchema.optional(),
  filename: z.string().trim().min(1).optional(),
  contentType: z.string().trim().min(1).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  size: z.number().int().nonnegative().optional(),
  duration: z.number().int().positive().optional(),
});

export const platformPayloadSchema = z.object({
  accountId: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  customContent: z.string().optional(),
  platformSpecificData: z.unknown().optional(),
});

const instagramSettingsSchema = z
  .object({
    postType: z.enum(["feed", "reel", "story"]).default("feed"),
    reelShareToFeed: z.boolean().optional(),
    reelFeedThumbnail: mediaReferenceSchema.optional(),
  })
  .strip();

const youtubeSettingsSchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    visibility: z.enum(["public", "private", "unlisted"]),
    madeForKids: z.boolean(),
    tags: z.array(z.string().trim().min(1).max(30)).max(50).default([]),
    thumbnail: mediaReferenceSchema.optional(),
  })
  .strip();

const pinterestSettingsSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    boardId: z.string().trim().min(1).optional(),
    link: z.string().trim().url().optional(),
  })
  .strip();

export type PostMediaItemInput = z.infer<typeof mediaItemSchema>;

export interface PlatformPayloadInput {
  accountId: string;
  platform: Platform;
  providerIdentifier?: string;
  settingsSchemaKey?: SettingsSchemaKey;
  customContent?: string;
  platformSpecificData?: unknown;
}

export interface NormalizedPlatformPayload {
  accountId: string;
  platform: Platform;
  providerIdentifier?: string;
  customContent?: string;
  platformSpecificData?: PlatformSpecificData;
}

export interface ValidationIssue {
  path: string;
  message: string;
  accountId?: string;
  platform?: Platform;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; issues: ValidationIssue[] };

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMimeType(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.split(";")[0]?.trim().toLowerCase() || "";
}

function hasMp4UrlExtension(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".mp4");
  } catch {
    return url.toLowerCase().split("?")[0].endsWith(".mp4");
  }
}

function createIssue(
  issue: ValidationIssue,
  issues: ValidationIssue[],
): void {
  issues.push(issue);
}

function toCustomContent(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeMediaReference(
  value: unknown,
): PlatformMediaReference | undefined {
  const parsed = mediaReferenceSchema.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data;
}

function normalizeInstagramSettings(params: {
  accountId: string;
  mediaItems: PostMediaItemInput[];
  platformSpecificData: unknown;
  issues: ValidationIssue[];
  pathPrefix: string;
}): InstagramPlatformData | undefined {
  const parsed = instagramSettingsSchema.safeParse(
    params.platformSpecificData ?? {},
  );

  if (!parsed.success) {
    createIssue(
      {
        path: params.pathPrefix,
        message:
          "Instagram settings are invalid. Use postType, reelShareToFeed and reelFeedThumbnail.",
        accountId: params.accountId,
        platform: "instagram",
      },
      params.issues,
    );
    return undefined;
  }

  if (params.mediaItems.length !== 1) {
    createIssue(
      {
        path: `${params.pathPrefix}.postType`,
        message: "Instagram requires exactly one media item.",
        accountId: params.accountId,
        platform: "instagram",
      },
      params.issues,
    );
    return undefined;
  }

  const mediaType = params.mediaItems[0]?.type;
  if (mediaType === "image" && parsed.data.postType === "reel") {
    createIssue(
      {
        path: `${params.pathPrefix}.postType`,
        message: "Instagram image posts only support feed or story.",
        accountId: params.accountId,
        platform: "instagram",
      },
      params.issues,
    );
    return undefined;
  }

  if (mediaType === "video" && parsed.data.postType === "feed") {
    createIssue(
      {
        path: `${params.pathPrefix}.postType`,
        message: "Instagram video posts only support story or reel.",
        accountId: params.accountId,
        platform: "instagram",
      },
      params.issues,
    );
    return undefined;
  }

  if (mediaType === "video") {
    const videoMedia = params.mediaItems[0];
    const normalizedContentType = normalizeMimeType(videoMedia?.contentType);
    if (normalizedContentType !== "video/mp4") {
      createIssue(
        {
          path: `${params.pathPrefix}.postType`,
          message: "Instagram video posts require MP4 media (video/mp4).",
          accountId: params.accountId,
          platform: "instagram",
        },
        params.issues,
      );
      return undefined;
    }

    if (!hasMp4UrlExtension(videoMedia.url)) {
      createIssue(
        {
          path: `${params.pathPrefix}.postType`,
          message: "Instagram video URL must end with .mp4.",
          accountId: params.accountId,
          platform: "instagram",
        },
        params.issues,
      );
      return undefined;
    }
  }

  const normalized: InstagramPlatformData = {
    postType: parsed.data.postType,
  };

  if (parsed.data.postType === "reel") {
    normalized.reelShareToFeed = parsed.data.reelShareToFeed ?? true;
    if (parsed.data.reelFeedThumbnail) {
      normalized.reelFeedThumbnail = parsed.data.reelFeedThumbnail;
    }
  }

  return normalized;
}

function normalizeYouTubeSettings(params: {
  accountId: string;
  mediaItems: PostMediaItemInput[];
  platformSpecificData: unknown;
  issues: ValidationIssue[];
  pathPrefix: string;
}): YouTubePlatformData | undefined {
  const parsed = youtubeSettingsSchema.safeParse(params.platformSpecificData);
  if (!parsed.success) {
    createIssue(
      {
        path: params.pathPrefix,
        message:
          "YouTube settings are invalid. Title, visibility, madeForKids and tags are required.",
        accountId: params.accountId,
        platform: "youtube",
      },
      params.issues,
    );
    return undefined;
  }

  if (params.mediaItems.length !== 1 || params.mediaItems[0]?.type !== "video") {
    createIssue(
      {
        path: params.pathPrefix,
        message: "YouTube requires exactly one video media item.",
        accountId: params.accountId,
        platform: "youtube",
      },
      params.issues,
    );
    return undefined;
  }

  const normalizedTags = Array.from(
    new Set(parsed.data.tags.map((tag) => tag.trim()).filter(Boolean)),
  );

  const normalized: YouTubePlatformData = {
    title: parsed.data.title.trim(),
    visibility: parsed.data.visibility,
    madeForKids: parsed.data.madeForKids,
    tags: normalizedTags,
  };

  if (parsed.data.thumbnail) {
    normalized.thumbnail = parsed.data.thumbnail;
  }

  return normalized;
}

function normalizePinterestSettings(params: {
  accountId: string;
  platformSpecificData: unknown;
  issues: ValidationIssue[];
  pathPrefix: string;
}): PinterestPlatformData | undefined {
  if (params.platformSpecificData === undefined) {
    return undefined;
  }

  if (!isObjectRecord(params.platformSpecificData)) {
    createIssue(
      {
        path: params.pathPrefix,
        message: "Pinterest settings must be an object.",
        accountId: params.accountId,
        platform: "pinterest",
      },
      params.issues,
    );
    return undefined;
  }

  const parsed = pinterestSettingsSchema.safeParse(params.platformSpecificData);
  if (!parsed.success) {
    createIssue(
      {
        path: params.pathPrefix,
        message: "Pinterest settings are invalid.",
        accountId: params.accountId,
        platform: "pinterest",
      },
      params.issues,
    );
    return undefined;
  }

  return parsed.data;
}

function normalizeFallbackSettings(params: {
  accountId: string;
  platform: Platform;
  platformSpecificData: unknown;
  issues: ValidationIssue[];
  pathPrefix: string;
}): PlatformSpecificData | undefined {
  if (params.platformSpecificData === undefined) {
    return undefined;
  }

  if (!isObjectRecord(params.platformSpecificData)) {
    createIssue(
      {
        path: params.pathPrefix,
        message: "Platform settings must be an object.",
        accountId: params.accountId,
        platform: params.platform,
      },
      params.issues,
    );
    return undefined;
  }

  return params.platformSpecificData as PlatformSpecificData;
}

export function validateAndNormalizePlatformPayloads(params: {
  platforms: PlatformPayloadInput[];
  mediaItems: PostMediaItemInput[];
}): ValidationResult<NormalizedPlatformPayload[]> {
  const issues: ValidationIssue[] = [];
  const fallbackSchemaByPlatform: Record<Platform, SettingsSchemaKey> = {
    instagram: "instagram",
    youtube: "youtube",
    pinterest: "pinterest",
    tiktok: "none",
    linkedin: "none",
    twitter: "none",
    facebook: "none",
    threads: "none",
    bluesky: "none",
    snapchat: "none",
    googlebusiness: "none",
    reddit: "none",
    telegram: "none",
  };

  const normalized = params.platforms.map((entry, index) => {
    const pathPrefix = `platforms.${index}.platformSpecificData`;
    const settingsSchemaKey =
      entry.settingsSchemaKey ?? fallbackSchemaByPlatform[entry.platform] ?? "none";

    let platformSpecificData: PlatformSpecificData | undefined;

    switch (settingsSchemaKey) {
      case "instagram":
        platformSpecificData = normalizeInstagramSettings({
          accountId: entry.accountId,
          mediaItems: params.mediaItems,
          platformSpecificData: entry.platformSpecificData,
          issues,
          pathPrefix,
        });
        break;
      case "youtube":
        platformSpecificData = normalizeYouTubeSettings({
          accountId: entry.accountId,
          mediaItems: params.mediaItems,
          platformSpecificData: entry.platformSpecificData,
          issues,
          pathPrefix,
        });
        break;
      case "pinterest":
        platformSpecificData = normalizePinterestSettings({
          accountId: entry.accountId,
          platformSpecificData: entry.platformSpecificData,
          issues,
          pathPrefix,
        });
        break;
      default:
        platformSpecificData = normalizeFallbackSettings({
          accountId: entry.accountId,
          platform: entry.platform,
          platformSpecificData: entry.platformSpecificData,
          issues,
          pathPrefix,
        });
        break;
    }

    return {
      accountId: entry.accountId,
      platform: entry.platform,
      providerIdentifier: entry.providerIdentifier,
      customContent: toCustomContent(entry.customContent),
      platformSpecificData,
    } satisfies NormalizedPlatformPayload;
  });

  if (issues.length > 0) {
    return {
      ok: false,
      error: issues[0]?.message ?? "Invalid platform settings",
      issues,
    };
  }

  return {
    ok: true,
    data: normalized,
  };
}

export function extractPlatformMediaReferences(params: {
  platform: Platform;
  platformSpecificData: unknown;
}): PlatformMediaReference[] {
  if (!isObjectRecord(params.platformSpecificData)) {
    return [];
  }

  if (params.platform === "instagram") {
    const thumbnail = normalizeMediaReference(
      params.platformSpecificData.reelFeedThumbnail,
    );
    return thumbnail ? [thumbnail] : [];
  }

  if (params.platform === "youtube") {
    const thumbnail = normalizeMediaReference(
      params.platformSpecificData.thumbnail,
    );
    return thumbnail ? [thumbnail] : [];
  }

  return [];
}
