import type { Platform } from "@/lib/platforms/types";
import type { BYOPlatformProvider } from "@/lib/providers/types";
import { FacebookBYOProvider } from "@/lib/providers/byo/facebook";
import { InstagramBYOProvider } from "@/lib/providers/byo/instagram";
import { LinkedInBYOProvider } from "@/lib/providers/byo/linkedin";
import { PinterestBYOProvider } from "@/lib/providers/byo/pinterest";
import { ThreadsBYOProvider } from "@/lib/providers/byo/threads";
import { TikTokBYOProvider } from "@/lib/providers/byo/tiktok";
import { TwitterBYOProvider } from "@/lib/providers/byo/twitter";
import { YouTubeBYOProvider } from "@/lib/providers/byo/youtube";

type ProviderFactory = (workspaceId: string) => BYOPlatformProvider;

const registry: Partial<Record<Platform, ProviderFactory>> = {
  instagram: (workspaceId) => new InstagramBYOProvider(workspaceId),
  facebook: (workspaceId) => new FacebookBYOProvider(workspaceId),
  youtube: (workspaceId) => new YouTubeBYOProvider(workspaceId),
  linkedin: (workspaceId) => new LinkedInBYOProvider(workspaceId),
  tiktok: (workspaceId) => new TikTokBYOProvider(workspaceId),
  pinterest: (workspaceId) => new PinterestBYOProvider(workspaceId),
  twitter: (workspaceId) => new TwitterBYOProvider(workspaceId),
  threads: (workspaceId) => new ThreadsBYOProvider(workspaceId),
};

export function listRegisteredPlatformProviders(): Platform[] {
  return Object.keys(registry) as Platform[];
}

export function getPlatformProvider(
  workspaceId: string,
  platform: Platform,
): BYOPlatformProvider {
  const providerFactory = registry[platform];
  if (!providerFactory) {
    throw new Error(`BYO provider for platform '${platform}' is not implemented`);
  }

  return providerFactory(workspaceId);
}

export function hasPlatformProvider(platform: Platform): boolean {
  return !!registry[platform];
}
