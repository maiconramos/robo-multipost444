import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentProfileId } from "./use-profiles";
import type { Platform, PlatformSpecificData } from "@/lib/platforms/types";

export const postKeys = {
  all: ["posts"] as const,
  lists: () => ["posts", "list"] as const,
  list: (filters: PostFilters) => ["posts", "list", filters] as const,
  detail: (postId: string) => ["posts", "detail", postId] as const,
};

export interface PostFilters {
  profileId?: string;
  status?: "draft" | "scheduled" | "publishing" | "published" | "failed";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface MediaItem {
  type: "image" | "video";
  url: string;
  key?: string;
  provider?: "VERCEL_BLOB" | "S3_COMPAT" | "CLOUDFLARE_R2" | "URL_ONLY" | "late";
  filename?: string;
  contentType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface PlatformPost {
  platform: Platform;
  accountId: string;
  customContent?: string;
  platformSpecificData?: PlatformSpecificData;
}

export interface CreatePostInput {
  content: string;
  platforms: PlatformPost[];
  mediaItems?: MediaItem[];
  scheduledFor?: string;
  publishNow?: boolean;
  timezone?: string;
  queuedFromProfile?: string;
  saveDraft?: boolean;
}

export interface UpdatePostInput {
  postId: string;
  content?: string;
  platforms?: PlatformPost[];
  mediaItems?: MediaItem[];
  scheduledFor?: string;
  timezone?: string;
}

export interface PostResponse {
  _id: string;
  id: string;
  socialAccountId?: string;
  content: string;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  scheduledFor?: string;
  publishedAt?: string;
  timezone?: string;
  queueId?: string;
  queuedFromProfile?: string;
  mediaItems: Array<{
    id: string;
    type: "image" | "video";
    url: string;
    filename?: string;
    contentType?: string;
    width?: number;
    height?: number;
    size?: number;
    duration?: number;
  }>;
  platforms: Array<{
    platform: Platform;
    accountId: string;
    status?: string;
    platformPostUrl?: string;
    customContent?: string;
    platformSpecificData?: PlatformSpecificData;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PostsListResponse {
  posts: PostResponse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface PostDetailResponse {
  post: PostResponse;
  publishExecution?: "processed_now" | "queued_for_cron" | "queued_fallback";
}

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload as T;
}

/**
 * Hook to fetch posts with filters
 */
export function usePosts(filters: PostFilters = {}) {
  const currentProfileId = useCurrentProfileId();
  const profileId = filters.profileId || currentProfileId;

  return useQuery({
    queryKey: postKeys.list({ ...filters, profileId }),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (profileId) params.set("profileId", profileId);
      if (filters.status) params.set("status", filters.status);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.page) params.set("page", String(filters.page));
      params.set("limit", String(filters.limit || 50));

      return fetchApi<PostsListResponse>(`/api/posts?${params.toString()}`);
    },
    enabled: !!profileId,
  });
}

/**
 * Hook to fetch a single post
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: async () => {
      return fetchApi<PostDetailResponse>(`/api/posts/${postId}`);
    },
    enabled: !!postId,
  });
}

/**
 * Hook to create a post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      return fetchApi<PostDetailResponse>("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to update a post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, ...input }: UpdatePostInput) => {
      return fetchApi<PostDetailResponse>(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to delete a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      await fetchApi<{ success: boolean }>(`/api/posts/${postId}`, {
        method: "DELETE",
      });
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.removeQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to approve a draft post (OWNER/ADMIN only)
 */
export function useApprovePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      scheduledFor,
    }: {
      postId: string;
      scheduledFor?: string;
    }) => {
      return fetchApi<{ post: PostResponse }>(`/api/posts/${postId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor }),
      });
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to retry a failed post
 */
export function useRetryPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      return fetchApi<PostDetailResponse>(`/api/posts/${postId}/retry`, {
        method: "POST",
      });
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

/**
 * Hook to fetch posts for calendar view (by date range)
 */
export function useCalendarPosts(dateFrom: string, dateTo: string) {
  return usePosts({
    dateFrom,
    dateTo,
    limit: 500,
  });
}

/**
 * Hook to fetch scheduled posts
 */
export function useScheduledPosts(limit = 10) {
  return usePosts({
    status: "scheduled",
    limit,
  });
}

/**
 * Hook to fetch recent posts (published)
 */
export function useRecentPosts(limit = 10) {
  return usePosts({
    status: "published",
    limit,
  });
}

/**
 * Hook to fetch draft posts (pending approval)
 */
export function useDraftPosts(limit = 50) {
  return usePosts({
    status: "draft",
    limit,
  });
}
