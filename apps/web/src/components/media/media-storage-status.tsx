"use client";

import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";
import type { MediaStorageStatusResponse } from "@/hooks/use-media-assets";

interface MediaStorageStatusProps {
  status: MediaStorageStatusResponse;
  variant?: "default" | "compact";
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function MediaStorageStatus({
  status,
  variant = "default",
  className,
}: MediaStorageStatusProps) {
  const { t } = useI18n();
  const hasQuota =
    typeof status.quotaBytes === "number" && status.quotaBytes > 0;

  return (
    <div className={cn("space-y-1.5", variant === "compact" && "space-y-1", className)}>
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs text-muted-foreground",
            variant === "default" && "text-sm",
          )}
        >
          {t("Storage plan: {plan}", { plan: status.planName })}
        </p>
        <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {status.provider}
        </span>
      </div>

      <p className={cn("text-xs text-muted-foreground", variant === "default" && "text-sm")}>
        {hasQuota
          ? t("{used} used • {remaining} left", {
              used: formatBytes(status.usedBytes),
              remaining: formatBytes(status.remainingBytes ?? 0),
            })
          : t("{used} used", { used: formatBytes(status.usedBytes) })}
      </p>

      {hasQuota && typeof status.usedPercent === "number" ? (
        <div className={cn("w-full rounded-full bg-muted", variant === "compact" ? "h-1.5" : "h-2")}>
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, status.usedPercent))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
