import type { Platform } from "../types/platforms";

// ---------------------------------------------------------------------------
// Row interfaces — plain TypeScript types matching the DB shape.
// These replace the Prisma-generated types so the shared package stays
// runtime-agnostic (no @prisma/client dependency).
// ---------------------------------------------------------------------------

export interface PostRow {
  id: string;
  workspaceId: string;
  profileId: string;
  socialAccountId: string | null;
  content: string | null;
  status: string;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  timezone: string | null;
  queueId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItemRow {
  id: string;
  type: string;
  url: string;
  key: string | null;
  provider: string | null;
  filename: string | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  duration: number | null;
}

export interface PlatformPostRow {
  id: string;
  platform: string;
  providerIdentifier: string;
  accountId: string;
  status: string;
  customContent: string | null;
  platformData: unknown;
  platformPostId: string | null;
  platformPostUrl: string | null;
  errorMessage: string | null;
  publishedAt: Date | null;
}

export interface CronJobRow {
  id: string;
  scheduledAt: Date;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  completedAt: Date | null;
}

export interface MediaAssetRow {
  id: string;
  workspaceId: string;
  type: string;
  url: string;
  key: string | null;
  provider: string | null;
  filename: string | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  duration: number | null;
  createdAt: Date;
}

export type PostWithRelations = PostRow & {
  mediaItems: MediaItemRow[];
  platformPosts: PlatformPostRow[];
  cronJob?: CronJobRow | null;
};

export type PublishExecution =
  | "processed_now"
  | "queued_for_cron"
  | "queued_fallback";

export function serializePost(post: PostWithRelations) {
  return {
    _id: post.id,
    id: post.id,
    workspaceId: post.workspaceId,
    profileId: post.profileId,
    socialAccountId: post.socialAccountId ?? undefined,
    content: post.content ?? "",
    status: post.status,
    scheduledFor: post.scheduledFor?.toISOString(),
    publishedAt: post.publishedAt?.toISOString(),
    timezone: post.timezone ?? undefined,
    queueId: post.queueId ?? undefined,
    queuedFromProfile: post.queueId ? post.profileId : undefined,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    mediaItems: post.mediaItems.map((item) => ({
      id: item.id,
      type: item.type as "image" | "video",
      url: item.url,
      key: item.key ?? undefined,
      provider: item.provider ?? undefined,
      filename: item.filename ?? undefined,
      contentType: item.contentType ?? undefined,
      width: item.width ?? undefined,
      height: item.height ?? undefined,
      size: item.size ?? undefined,
      duration: item.duration ?? undefined,
    })),
    platformPosts: post.platformPosts.map((platformPost) => ({
      id: platformPost.id,
      platform: platformPost.platform as Platform,
      providerIdentifier: platformPost.providerIdentifier,
      accountId: platformPost.accountId,
      status: platformPost.status,
      customContent: platformPost.customContent ?? undefined,
      platformData: platformPost.platformData ?? undefined,
      platformPostId: platformPost.platformPostId ?? undefined,
      platformPostUrl: platformPost.platformPostUrl ?? undefined,
      errorMessage: platformPost.errorMessage ?? undefined,
      publishedAt: platformPost.publishedAt?.toISOString(),
    })),
    platforms: post.platformPosts.map((platformPost) => ({
      platform: platformPost.platform as Platform,
      providerIdentifier: platformPost.providerIdentifier,
      accountId: platformPost.accountId,
      status: platformPost.status,
      platformPostUrl: platformPost.platformPostUrl ?? undefined,
      customContent: platformPost.customContent ?? undefined,
      platformSpecificData: platformPost.platformData ?? undefined,
    })),
    cronJob: post.cronJob
      ? {
          id: post.cronJob.id,
          scheduledAt: post.cronJob.scheduledAt.toISOString(),
          status: post.cronJob.status,
          attempts: post.cronJob.attempts,
          maxAttempts: post.cronJob.maxAttempts,
          lastError: post.cronJob.lastError ?? undefined,
          lockedAt: post.cronJob.lockedAt?.toISOString(),
          lockedBy: post.cronJob.lockedBy ?? undefined,
          completedAt: post.cronJob.completedAt?.toISOString(),
        }
      : undefined,
  };
}

export function serializePostMutationResponse(
  post: PostWithRelations,
  publishExecution: PublishExecution,
) {
  return {
    post: serializePost(post),
    publishExecution,
  };
}

// ---------------------------------------------------------------------------
// Profile serializer
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  name: string;
  lateProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeProfile(profile: ProfileRow) {
  return {
    _id: profile.id,
    id: profile.id,
    name: profile.name,
    lateProfileId: profile.lateProfileId ?? undefined,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Queue serializer
// ---------------------------------------------------------------------------

export interface QueueSlotRow {
  id: string;
  dayOfWeek: number;
  time: string;
}

export interface QueueRow {
  id: string;
  profileId: string;
  workspaceId: string;
  name: string;
  timezone: string;
  active: boolean;
  isDefault: boolean;
  slots: QueueSlotRow[];
  createdAt: Date;
  updatedAt: Date;
}

export function serializeQueue(queue: QueueRow, nextSlots?: string[]) {
  return {
    _id: queue.id,
    id: queue.id,
    profileId: queue.profileId,
    workspaceId: queue.workspaceId,
    name: queue.name,
    timezone: queue.timezone,
    active: queue.active,
    isDefault: queue.isDefault,
    slots: queue.slots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      time: slot.time,
    })),
    nextSlots: nextSlots ?? [],
    createdAt: queue.createdAt.toISOString(),
    updatedAt: queue.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Social Account serializer
// ---------------------------------------------------------------------------

export interface SocialAccountRow {
  id: string;
  workspaceId: string;
  profileId: string;
  platform: string;
  providerIdentifier: string;
  connectionMethod: string;
  status: string;
  handle: string;
  name: string | null;
  meta: unknown;
  platformUserId: string | null;
  username: string;
  displayName: string | null;
  profilePicture: string | null;
  isActive: boolean;
  providerType: string | null;
  lateAccountId: string | null;
  tokenExpiresAt: Date | null;
  oauthMetadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeAccount(account: SocialAccountRow) {
  return {
    _id: account.id,
    id: account.id,
    workspaceId: account.workspaceId,
    profileId: account.profileId,
    platform: account.platform,
    providerIdentifier: account.providerIdentifier,
    socialPlatform: account.platform,
    connectionMethod: account.connectionMethod,
    status: account.status,
    handle: account.handle,
    name: account.name ?? undefined,
    meta: account.meta ?? undefined,
    platformUserId: account.platformUserId ?? undefined,
    username: account.username || account.handle,
    displayName: account.displayName ?? account.name ?? undefined,
    profilePicture: account.profilePicture ?? undefined,
    isActive: account.isActive,
    providerType: account.providerType ?? undefined,
    lateAccountId: account.lateAccountId ?? undefined,
    tokenExpiresAt: account.tokenExpiresAt?.toISOString(),
    oauthMetadata: account.oauthMetadata ?? undefined,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Media asset serializer
// ---------------------------------------------------------------------------

export function serializeMediaAsset(asset: MediaAssetRow) {
  return {
    id: asset.id,
    workspaceId: asset.workspaceId,
    type: asset.type as "image" | "video",
    url: asset.url,
    key: asset.key ?? undefined,
    provider: asset.provider ?? undefined,
    filename: asset.filename ?? undefined,
    contentType: asset.contentType ?? undefined,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    size: asset.size ?? undefined,
    duration: asset.duration ?? undefined,
    createdAt: asset.createdAt.toISOString(),
  };
}
