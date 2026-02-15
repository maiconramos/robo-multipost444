import type {
  CronJob,
  MediaAsset,
  MediaItem,
  PlatformPost,
  Post,
  Profile,
  Queue,
  QueueSlot,
  SocialAccount,
} from "@prisma/client";
import type { Platform } from "@/lib/platforms/types";
import { fromSocialPlatform } from "@/lib/social-accounts";

export type PostWithRelations = Post & {
  mediaItems: MediaItem[];
  platformPosts: PlatformPost[];
  cronJob?: CronJob | null;
};

export type PublishExecution =
  | "processed_now"
  | "queued_for_cron"
  | "queued_fallback";

export type QueueWithSlots = Queue & {
  slots: QueueSlot[];
};

export function serializeProfile(profile: Profile) {
  return {
    _id: profile.id,
    id: profile.id,
    name: profile.name,
    lateProfileId: profile.lateProfileId ?? undefined,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeAccount(account: SocialAccount) {
  const appPlatform = fromSocialPlatform(account.platform);

  return {
    _id: account.id,
    id: account.id,
    workspaceId: account.workspaceId,
    profileId: account.profileId,
    platform: appPlatform as Platform,
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

export function serializeQueue(queue: QueueWithSlots, nextSlots?: string[]) {
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

export function serializeMediaAsset(asset: MediaAsset) {
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
