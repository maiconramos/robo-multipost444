import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { CloudflareR2Storage } from "@/lib/storage/cloudflare-r2-storage";
import { resolveStoragePlanConfig } from "@/lib/storage/storage-plan";

type UsageSource = "blob_sdk" | "r2_api" | "db";

interface StorageStatusResponse {
  provider: "VERCEL_BLOB" | "S3_COMPAT" | "CLOUDFLARE_R2" | "URL_ONLY";
  planName: string;
  quotaBytes: number | null;
  usedBytes: number;
  remainingBytes: number | null;
  usedPercent: number | null;
  usageSource: UsageSource;
  isQuotaFallback: boolean;
}

function toStorageStatusResponse(params: {
  provider: "VERCEL_BLOB" | "S3_COMPAT" | "CLOUDFLARE_R2" | "URL_ONLY";
  planName: string;
  quotaBytes: number | null;
  usedBytes: number;
  usageSource: UsageSource;
  isQuotaFallback: boolean;
}): StorageStatusResponse {
  const safeUsedBytes = Math.max(0, params.usedBytes);
  const hasQuota =
    typeof params.quotaBytes === "number" && params.quotaBytes > 0;

  const remainingBytes = hasQuota
    ? Math.max((params.quotaBytes as number) - safeUsedBytes, 0)
    : null;

  const usedPercent = hasQuota
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (safeUsedBytes / (params.quotaBytes as number)) * 1000,
          ) / 10,
        ),
      )
    : null;

  return {
    provider: params.provider,
    planName: params.planName,
    quotaBytes: params.quotaBytes,
    usedBytes: safeUsedBytes,
    remainingBytes,
    usedPercent,
    usageSource: params.usageSource,
    isQuotaFallback: params.isQuotaFallback,
  };
}

async function getUsedBytesFromDatabase(workspaceId: string): Promise<number> {
  const aggregate = await prisma.mediaAsset.aggregate({
    where: { workspaceId },
    _sum: { size: true },
  });

  return aggregate._sum.size ?? 0;
}

async function getUsedBytesFromBlob(prefix: string): Promise<number> {
  let cursor: string | undefined;
  let total = 0;

  do {
    const response = await list({
      prefix,
      cursor,
      limit: 1000,
    });

    total += response.blobs.reduce((sum, blob) => sum + blob.size, 0);
    cursor = response.hasMore ? response.cursor : undefined;
  } while (cursor);

  return total;
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const storagePlan = resolveStoragePlanConfig();

    let usedBytes = 0;
    let usageSource: UsageSource = "db";

    if (storagePlan.provider === "VERCEL_BLOB") {
      const prefix = `${workspace.id}/`;

      try {
        usedBytes = await getUsedBytesFromBlob(prefix);
        usageSource = "blob_sdk";
      } catch (error) {
        console.error(
          `GET /api/media/storage: blob usage lookup failed for workspace ${workspace.id}; falling back to database usage`,
          error,
        );
        usedBytes = await getUsedBytesFromDatabase(workspace.id);
        usageSource = "db";
      }
    } else if (storagePlan.provider === "CLOUDFLARE_R2") {
      try {
        const r2Usage = await CloudflareR2Storage.getBucketUsage();
        usedBytes = r2Usage.payloadSize;
        usageSource = "r2_api";
      } catch (error) {
        console.error(
          `GET /api/media/storage: R2 usage API failed for workspace ${workspace.id}; falling back to database usage`,
          error,
        );
        usedBytes = await getUsedBytesFromDatabase(workspace.id);
        usageSource = "db";
      }
    } else {
      usedBytes = await getUsedBytesFromDatabase(workspace.id);
      usageSource = "db";
    }

    return NextResponse.json(
      toStorageStatusResponse({
        provider: storagePlan.provider,
        planName: storagePlan.planName,
        quotaBytes: storagePlan.quotaBytes,
        usedBytes,
        usageSource,
        isQuotaFallback: storagePlan.isQuotaFallback,
      }),
    );
  } catch (error) {
    return handleApiError(error, "GET /api/media/storage error");
  }
}
