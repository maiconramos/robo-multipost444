import type { MediaItem, PlatformPost, Post, SocialAccount } from "@prisma/client";
import { encrypt } from "@/lib/encryption";
import { validatePostMediaAssetsForPublishing } from "@/lib/media/media-asset-check";
import { getProviderForAccount } from "@/lib/providers";
import type { ProviderPlatformPost, ProviderPost } from "@/lib/providers/types";
import { prisma } from "@/lib/prisma";

export const DEFAULT_PUBLISH_BATCH_SIZE = 10;
const RETRYABLE_PROVIDER_ERROR_CODES = new Set(["PROCESSING_TIMEOUT"]);
const RETRYABLE_FAILURE_BACKOFF_MS = 2 * 60 * 1000;

type PostWithRelations = Post & {
  mediaItems: MediaItem[];
  platformPosts: Array<PlatformPost & { account: SocialAccount }>;
};

export interface ProcessPendingJobsOptions {
  batchSize?: number;
  now?: Date;
  postId?: string;
}

export interface ProcessPendingJobsResult {
  processed: number;
  succeeded: number;
  failed: number;
  processedPostIds: string[];
  succeededPostIds: string[];
  failedPostIds: string[];
}

export async function processPendingJobs(
  options: ProcessPendingJobsOptions = {},
): Promise<ProcessPendingJobsResult> {
  const now = options.now ?? new Date();
  const jobs = await prisma.cronJob.findMany({
    where: {
      scheduledAt: { lte: now },
      status: "pending",
      ...(options.postId ? { postId: options.postId } : {}),
    },
    orderBy: { scheduledAt: "asc" },
    take: options.batchSize ?? DEFAULT_PUBLISH_BATCH_SIZE,
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const processedPostIds: string[] = [];
  const succeededPostIds: string[] = [];
  const failedPostIds: string[] = [];

  for (const job of jobs) {
    if (job.attempts >= job.maxAttempts) {
      continue;
    }

    const lockResult = await prisma.cronJob.updateMany({
      where: {
        id: job.id,
        status: "pending",
        attempts: { lt: job.maxAttempts },
      },
      data: {
        status: "locked",
        lockedAt: new Date(),
        lockedBy: process.env.VERCEL_REGION || "local-worker",
      },
    });

    if (lockResult.count === 0) {
      continue;
    }

    processed += 1;

    try {
      const fullJob = await prisma.cronJob.findUnique({
        where: { id: job.id },
        include: {
          post: {
            include: {
              mediaItems: true,
              platformPosts: {
                include: {
                  account: true,
                },
              },
            },
          },
        },
      });

      if (!fullJob?.post) {
        throw new Error("Cron job post not found");
      }

      const post = fullJob.post as PostWithRelations;
      processedPostIds.push(post.id);

      const providerPost = post as ProviderPost;

      await prisma.post.update({
        where: { id: post.id },
        data: { status: "publishing" },
      });

      if (post.platformPosts.length === 0) {
        throw new Error("Post has no platform posts to publish");
      }

      try {
        await validatePostMediaAssetsForPublishing(
          post.mediaItems.map((mediaItem) => ({
            type: mediaItem.type === "video" ? "video" : "image",
            url: mediaItem.url,
            key: mediaItem.key,
            provider: mediaItem.provider,
            contentType: mediaItem.contentType,
          })),
        );
      } catch (mediaValidationError) {
        const failureMessage =
          mediaValidationError instanceof Error
            ? mediaValidationError.message
            : "Post media validation failed before publish";

        await prisma.platformPost.updateMany({
          where: { postId: post.id },
          data: {
            status: "failed",
            errorMessage: failureMessage,
          },
        });

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "failed",
            publishedAt: null,
          },
        });

        await prisma.cronJob.update({
          where: { id: fullJob.id },
          data: {
            status: "failed",
            attempts: { increment: 1 },
            lastError: failureMessage,
            lockedAt: null,
            lockedBy: null,
          },
        });

        failed += 1;
        failedPostIds.push(post.id);
        continue;
      }

      let anyFailure = false;
      let anyRetryableFailure = false;
      let anySuccess = false;
      let firstFailureMessage: string | null = null;

      for (const platformPostRow of post.platformPosts) {
        const providerPlatformPost = platformPostRow as ProviderPlatformPost;

        if (providerPlatformPost.status === "published") {
          anySuccess = true;
          continue;
        }

        const account = providerPlatformPost.account;
        const providerIdentifier =
          providerPlatformPost.providerIdentifier || account.providerIdentifier;
        const provider = await getProviderForAccount(post.workspaceId, {
          id: account.id,
          connectionMethod: account.connectionMethod,
          providerIdentifier,
        });

        await prisma.platformPost.update({
          where: { id: providerPlatformPost.id },
          data: {
            status: "publishing",
            errorMessage: null,
          },
        });

        try {
          const usesLateProvider = providerIdentifier.startsWith("late.");
          if (
            !usesLateProvider &&
            account.tokenExpiresAt &&
            account.tokenExpiresAt <= new Date()
          ) {
            const refreshed = await provider.refreshToken(account);
            providerPlatformPost.account.accessTokenEnc = encrypt(refreshed.accessToken);
            providerPlatformPost.account.refreshTokenEnc = refreshed.refreshToken
              ? encrypt(refreshed.refreshToken)
              : null;
            providerPlatformPost.account.tokenExpiresAt = refreshed.expiresAt ?? null;
          }

          const result = await provider.publishPost(providerPost, providerPlatformPost);

          if (result.success) {
            anySuccess = true;
            await prisma.platformPost.update({
              where: { id: providerPlatformPost.id },
              data: {
                status: "published",
                platformPostId: result.platformPostId,
                platformPostUrl: result.platformPostUrl,
                publishedAt: new Date(),
                errorMessage: null,
              },
            });
          } else {
            const failureMessage = result.error || "Unknown publish error";
            const retryableFailure =
              typeof result.errorCode === "string" &&
              RETRYABLE_PROVIDER_ERROR_CODES.has(result.errorCode);

            if (retryableFailure) {
              anyRetryableFailure = true;
            } else {
              anyFailure = true;
            }

            if (!firstFailureMessage) {
              firstFailureMessage = failureMessage;
            }
            await prisma.platformPost.update({
              where: { id: providerPlatformPost.id },
              data: {
                status: retryableFailure ? "pending" : "failed",
                errorMessage: failureMessage,
                ...(retryableFailure
                  ? {
                    platformPostId: null,
                    platformPostUrl: null,
                    publishedAt: null,
                  }
                  : {}),
              },
            });

            if (retryableFailure) {
              console.warn(
                `[publish-runner] retryable provider failure: postId=${post.id}, platformPostId=${providerPlatformPost.id}, platform=${providerPlatformPost.platform}, code=${result.errorCode}, message=${failureMessage}`,
              );
            }
          }
        } catch (platformError) {
          anyFailure = true;
          const failureMessage =
            platformError instanceof Error
              ? platformError.message
              : "Unknown publish error";
          if (!firstFailureMessage) {
            firstFailureMessage = failureMessage;
          }
          await prisma.platformPost.update({
            where: { id: providerPlatformPost.id },
            data: {
              status: "failed",
              errorMessage: failureMessage,
            },
          });

          console.error(
            `[publish-runner] provider exception: postId=${post.id}, platformPostId=${providerPlatformPost.id}, platform=${providerPlatformPost.platform}, message=${failureMessage}`,
          );
        }
      }

      if (anyFailure) {
        failed += 1;
        failedPostIds.push(post.id);

        if (firstFailureMessage) {
          await prisma.platformPost.updateMany({
            where: {
              postId: post.id,
              status: "pending",
            },
            data: {
              status: "failed",
              errorMessage: firstFailureMessage,
            },
          });
        }

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "failed",
            ...(anySuccess ? {} : { publishedAt: null }),
          },
        });

        await prisma.cronJob.update({
          where: { id: fullJob.id },
          data: {
            status: "failed",
            attempts: { increment: 1 },
            lastError: firstFailureMessage || "One or more platform publishes failed",
            lockedAt: null,
            lockedBy: null,
          },
        });
      } else if (anyRetryableFailure) {
        const nextAttempt = fullJob.attempts + 1;
        const retryAt = new Date(Date.now() + RETRYABLE_FAILURE_BACKOFF_MS);

        if (nextAttempt >= fullJob.maxAttempts) {
          failed += 1;
          failedPostIds.push(post.id);

          const finalFailureMessage = firstFailureMessage
            ? `${firstFailureMessage} (max retry attempts reached)`
            : "Retryable publish error reached max attempts";

          await prisma.platformPost.updateMany({
            where: {
              postId: post.id,
              status: { not: "published" },
            },
            data: {
              status: "failed",
              errorMessage: finalFailureMessage,
            },
          });

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: "failed",
              publishedAt: null,
            },
          });

          await prisma.cronJob.update({
            where: { id: fullJob.id },
            data: {
              status: "failed",
              attempts: { increment: 1 },
              lastError: finalFailureMessage,
              lockedAt: null,
              lockedBy: null,
            },
          });

          console.error(
            `[publish-runner] retryable failure exhausted attempts: postId=${post.id}, cronJobId=${fullJob.id}, attempts=${nextAttempt}/${fullJob.maxAttempts}, message=${finalFailureMessage}`,
          );
        } else {
          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: "scheduled",
              publishedAt: null,
            },
          });

          await prisma.cronJob.update({
            where: { id: fullJob.id },
            data: {
              status: "pending",
              scheduledAt: retryAt,
              attempts: { increment: 1 },
              lastError: firstFailureMessage || "Retryable platform publish error",
              lockedAt: null,
              lockedBy: null,
            },
          });

          console.warn(
            `[publish-runner] scheduled retry: postId=${post.id}, cronJobId=${fullJob.id}, attempts=${nextAttempt}/${fullJob.maxAttempts}, retryAt=${retryAt.toISOString()}, message=${firstFailureMessage || "Retryable platform publish error"}`,
          );
        }
      } else {
        succeeded += 1;
        succeededPostIds.push(post.id);

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "published",
            publishedAt: new Date(),
          },
        });

        await prisma.cronJob.update({
          where: { id: fullJob.id },
          data: {
            status: "completed",
            completedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          },
        });
      }
    } catch (error) {
      failed += 1;
      failedPostIds.push(job.postId);

      const message =
        error instanceof Error ? error.message : "Unexpected cron publish error";

      await prisma.cronJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: message,
          lockedAt: null,
          lockedBy: null,
        },
      });
    }
  }

  return {
    processed,
    succeeded,
    failed,
    processedPostIds,
    succeededPostIds,
    failedPostIds,
  };
}

export async function countPendingJobsReady(now: Date = new Date()): Promise<number> {
  return prisma.cronJob.count({
    where: {
      status: "pending",
      scheduledAt: { lte: now },
    },
  });
}
