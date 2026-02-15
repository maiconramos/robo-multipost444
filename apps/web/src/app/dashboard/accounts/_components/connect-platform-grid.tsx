"use client";

import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/shared";
import { PLATFORMS, PLATFORM_NAMES, PLATFORM_COLORS, type Platform } from "@/lib/platforms/types";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Loader2 } from "lucide-react";

interface ConnectPlatformGridProps {
  onConnect: (platform: Platform) => void;
  connectedPlatforms: Set<string>;
  isConnecting: boolean;
  connectingPlatform?: Platform;
}

export function ConnectPlatformGrid({
  onConnect,
  connectedPlatforms,
  isConnecting,
  connectingPlatform,
}: ConnectPlatformGridProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {PLATFORMS.map((platform) => {
        const isConnected = connectedPlatforms.has(platform);
        const isCurrentlyConnecting = connectingPlatform === platform;

        return (
          <button
            key={platform}
            onClick={() => onConnect(platform)}
            disabled={isConnecting}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${PLATFORM_COLORS[platform]}20`,
              }}
            >
              {isCurrentlyConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <PlatformIcon platform={platform} showColor size="lg" />
              )}
            </div>
            <span className="text-sm font-medium">
              {PLATFORM_NAMES[platform]}
            </span>
            {isConnected && (
              <Badge variant="secondary" className="text-xs">
                {t("Connected")}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
