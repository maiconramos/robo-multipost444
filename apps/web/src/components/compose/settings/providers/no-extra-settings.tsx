"use client";

import { useI18n } from "@/lib/i18n/use-i18n";
import type { SettingsProviderProps } from "@/components/compose/settings/registry";

export function NoExtraSettings({ errors }: SettingsProviderProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("No extra settings for this platform")}
      </p>
      {errors.length > 0 ? (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={`${error}-${index}`} className="text-xs text-destructive">
              {t(error)}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
