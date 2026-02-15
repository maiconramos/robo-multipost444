import { useQuery } from "@tanstack/react-query";

export type PublishingLogStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export interface PublishingLogFilters {
  postId?: string;
  status?: PublishingLogStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PublishingLogResponse {
  entries: Array<{
    post: {
      id: string;
      content: string;
      status: PublishingLogStatus;
      scheduledFor?: string;
      publishedAt?: string;
      createdAt: string;
      updatedAt: string;
    };
    cronJob: {
      id: string;
      status: string;
      attempts: number;
      maxAttempts: number;
      scheduledAt: string;
      lastError?: string;
      lockedAt?: string;
      completedAt?: string;
    } | null;
    platformPosts: Array<{
      id: string;
      platform: string;
      providerIdentifier: string;
      status: string;
      accountId: string;
      accountHandle: string;
      accountName?: string;
      platformPostId?: string;
      platformPostUrl?: string;
      errorMessage?: string;
      publishedAt?: string;
    }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const publishingLogKeys = {
  all: ["publishing-logs"] as const,
  list: (filters: PublishingLogFilters) =>
    ["publishing-logs", "list", filters] as const,
};

async function fetchPublishingLogs(
  filters: PublishingLogFilters,
): Promise<PublishingLogResponse> {
  const params = new URLSearchParams();

  if (filters.postId) params.set("postId", filters.postId);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page) params.set("page", String(filters.page));
  params.set("limit", String(filters.limit || 20));

  const response = await fetch(`/api/logs/publishing?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to fetch publishing logs");
  }

  return payload as PublishingLogResponse;
}

export function usePublishingLogs(filters: PublishingLogFilters = {}) {
  return useQuery({
    queryKey: publishingLogKeys.list(filters),
    queryFn: () => fetchPublishingLogs(filters),
  });
}
