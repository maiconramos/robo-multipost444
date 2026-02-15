import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores";
import { useEffect } from "react";

export const profileKeys = {
  all: ["profiles"] as const,
  detail: (id: string) => ["profiles", id] as const,
};

interface Profile {
  _id: string;
  id: string;
  name: string;
  lateProfileId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfilesResponse {
  profiles: Profile[];
  count: number;
}

interface ProfileResponse {
  profile: Profile;
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
 * Hook to fetch all profiles
 */
export function useProfiles() {
  const { defaultProfileId, setDefaultProfileId } = useAppStore();

  const query = useQuery({
    queryKey: profileKeys.all,
    queryFn: async () => {
      return fetchApi<ProfilesResponse>("/api/profiles");
    },
  });

  // Auto-set default profile if not set or invalid
  useEffect(() => {
    if (query.data?.profiles?.length) {
      const currentIsValid = query.data.profiles.some(p => p._id === defaultProfileId);
      if (!defaultProfileId || !currentIsValid) {
        setDefaultProfileId(query.data.profiles[0]._id);
      }
    }
  }, [query.data, defaultProfileId, setDefaultProfileId]);

  return query;
}

/**
 * Hook to get the current profile ID (from store or first profile)
 */
export function useCurrentProfileId(): string | undefined {
  const { defaultProfileId } = useAppStore();
  const { data } = useProfiles();
  return defaultProfileId || data?.profiles?.[0]?._id;
}

/**
 * Hook to fetch a single profile
 */
export function useProfile(profileId: string) {
  return useQuery({
    queryKey: profileKeys.detail(profileId),
    queryFn: async () => {
      return fetchApi<ProfileResponse>(`/api/profiles/${profileId}`);
    },
    enabled: !!profileId,
  });
}

/**
 * Hook to create a profile
 */
export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      return fetchApi<ProfileResponse>("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/**
 * Hook to update a profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      profileId,
      name,
      timezone,
    }: {
      profileId: string;
      name?: string;
      timezone?: string;
    }) => {
      return fetchApi<ProfileResponse>(`/api/profiles/${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      });
    },
    onSuccess: (_, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(profileId) });
    },
  });
}
