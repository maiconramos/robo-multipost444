import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MediaAsset {
  id: string;
  workspaceId: string;
  type: "image" | "video";
  url: string;
  key?: string;
  provider?: string;
  filename?: string;
  contentType?: string;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  createdAt: string;
}

interface MediaAssetsResponse {
  assets: MediaAsset[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MediaStorageStatusResponse {
  provider: "VERCEL_BLOB" | "S3_COMPAT" | "CLOUDFLARE_R2" | "URL_ONLY";
  planName: string;
  quotaBytes: number | null;
  usedBytes: number;
  remainingBytes: number | null;
  usedPercent: number | null;
  usageSource: "blob_sdk" | "r2_api" | "db";
  isQuotaFallback: boolean;
}

export interface MediaAssetsFilters {
  type?: "image" | "video";
  page?: number;
  limit?: number;
}

export const mediaAssetKeys = {
  all: ["media-assets"] as const,
  list: (filters: MediaAssetsFilters) =>
    ["media-assets", "list", filters] as const,
  storageStatus: () => ["media-assets", "storage-status"] as const,
};

async function fetchMediaAssets(
  filters: MediaAssetsFilters,
): Promise<MediaAssetsResponse> {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.page) params.set("page", String(filters.page));
  params.set("limit", String(filters.limit || 30));

  const res = await fetch(`/api/media?${params.toString()}`);
  const payload = (await res.json().catch(() => ({}))) as Partial<MediaAssetsResponse> & { error?: string };
  if (!res.ok)
    throw new Error(payload?.error || "Failed to fetch media assets");
  return payload as MediaAssetsResponse;
}

async function fetchMediaStorageStatus(): Promise<MediaStorageStatusResponse> {
  const res = await fetch("/api/media/storage");
  const payload = (await res.json().catch(() => ({}))) as Partial<MediaStorageStatusResponse> & {
    error?: string;
  };
  if (!res.ok)
    throw new Error(payload?.error || "Failed to fetch media storage status");
  return payload as MediaStorageStatusResponse;
}

export function useMediaAssets(filters: MediaAssetsFilters = {}) {
  return useQuery({
    queryKey: mediaAssetKeys.list(filters),
    queryFn: () => fetchMediaAssets(filters),
  });
}

export function useMediaStorageStatus() {
  return useQuery({
    queryKey: mediaAssetKeys.storageStatus(),
    queryFn: fetchMediaStorageStatus,
    staleTime: 30_000,
  });
}

export function useCreateMediaAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Omit<MediaAsset, "id" | "workspaceId" | "createdAt">,
    ) => {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await res.json().catch(() => ({}))) as { asset?: MediaAsset; error?: string };
      if (!res.ok)
        throw new Error(payload?.error || "Failed to create media asset");
      return payload.asset as MediaAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaAssetKeys.all });
    },
  });
}

export function useDeleteMediaAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) => {
      const res = await fetch(`/api/media/${assetId}`, { method: "DELETE" });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok)
        throw new Error(payload?.error || "Failed to delete media asset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaAssetKeys.all });
    },
  });
}

export function useClearMediaAssets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/media/clear", { method: "POST" });
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        deletedCount?: number;
        error?: string;
      };
      if (!res.ok)
        throw new Error(payload?.error || "Failed to clear media assets");
      return payload as { success: boolean; deletedCount: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaAssetKeys.all });
    },
  });
}
