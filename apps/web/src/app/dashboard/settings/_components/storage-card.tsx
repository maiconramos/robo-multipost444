"use client";

import { HardDrive } from "lucide-react";
import { useMediaStorageStatus } from "@/hooks/use-media-assets";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatQuotaInGb(quotaBytes: number | null, fallbackText: string): string {
  if (quotaBytes == null) {
    return fallbackText;
  }

  const gibibytes = quotaBytes / 1024 ** 3;
  const formatted =
    Math.round(gibibytes * 10) / 10 === Math.round(gibibytes)
      ? gibibytes.toFixed(0)
      : gibibytes.toFixed(1);

  return `${formatted} GB`;
}

export function StorageCard() {
  const { t } = useI18n();
  const { data, isLoading, isError } = useMediaStorageStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-4 w-4" />
          {t("Storage")}
        </CardTitle>
        <CardDescription>
          {t("Read-only global storage settings for this infrastructure.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        ) : data ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("Storage provider")}</span>
              <span className="text-sm font-medium">{data.provider}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("Plan")}</span>
              <span className="text-sm font-medium">{data.planName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("Quota")}</span>
              <span className="text-sm font-medium">
                {formatQuotaInGb(data.quotaBytes, t("No quota configured"))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Global infrastructure setting shared across all workspaces.")}
            </p>
            {data.isQuotaFallback ? (
              <p className="text-xs text-muted-foreground">
                {data.provider === "CLOUDFLARE_R2"
                  ? t("Using default Cloudflare R2 Free 10 GB quota.")
                  : t("Using default Hobby 1 GB quota fallback.")}
              </p>
            ) : null}
          </>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            {t("Unable to load storage details right now.")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
