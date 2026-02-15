import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  AIAvailability,
  GenerateImageOptions,
  GenerateImageResult,
  GenerateTextOptions,
  GenerateTextResult,
} from "@/lib/ai/types";

export const aiKeys = {
  all: ["ai"] as const,
  availability: () => ["ai", "availability"] as const,
};

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Request failed",
    );
  }

  return payload as T;
}

export function useGenerateText() {
  return useMutation({
    mutationFn: async (options: GenerateTextOptions) => {
      return fetchApi<GenerateTextResult>("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
    },
  });
}

export function useGenerateImage() {
  return useMutation({
    mutationFn: async (options: GenerateImageOptions) => {
      return fetchApi<GenerateImageResult>("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
    },
  });
}

export function useAIAvailable() {
  return useQuery({
    queryKey: aiKeys.availability(),
    queryFn: async () => {
      return fetchApi<AIAvailability>("/api/ai/status");
    },
    staleTime: 30_000,
  });
}
