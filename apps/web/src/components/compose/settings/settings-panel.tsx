"use client";

import { useEffect, useMemo, useState } from "react";
import type { Account, UploadedMedia } from "@/hooks";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { Platform, PlatformSpecificData } from "@/lib/platforms/types";
import { getSettingsProviderComponent } from "@/components/compose/settings/registry";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/shared/platform-icon";

interface SettingsPanelProps {
  accounts: Account[];
  media: UploadedMedia[];
  settingsByAccountId: Record<string, PlatformSpecificData | undefined>;
  errorsByAccountId: Record<string, string[]>;
  onSettingsChange: (accountId: string, value: PlatformSpecificData | undefined) => void;
  storageProvider?: string | null;
}

export function SettingsPanel({
  accounts,
  media,
  settingsByAccountId,
  errorsByAccountId,
  onSettingsChange,
  storageProvider,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const accountIds = useMemo(() => accounts.map((account) => account.id), [accounts]);
  const [openItems, setOpenItems] = useState<string[]>(accountIds);

  useEffect(() => {
    setOpenItems((current) => {
      const stillSelected = current.filter((id) => accountIds.includes(id));
      const newSelections = accountIds.filter((id) => !stillSelected.includes(id));
      return [...stillSelected, ...newSelections];
    });
  }, [accountIds]);

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{t("Per-account settings")}</p>
        <Badge variant="outline">{t("{count} selected", { count: accounts.length })}</Badge>
      </div>

      <div className="max-h-[38vh] overflow-y-auto pr-1">
        <Accordion
          type="multiple"
          value={openItems}
          onValueChange={setOpenItems}
          className="rounded-md border border-border bg-background px-3"
        >
          {accounts.map((account) => {
            const platform = account.platform as Platform;
            const SettingsComponent = getSettingsProviderComponent(
              account.providerIdentifier,
              platform,
            );
            const errors = errorsByAccountId[account.id] || [];

            return (
              <AccordionItem key={account.id} value={account.id}>
                <AccordionTrigger className="py-3">
                  <div className="flex w-full items-center justify-between gap-3 pr-2">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={platform} size="sm" showColor />
                      <div className="text-left">
                        <p className="text-sm font-medium">
                          {account.displayName || account.username || account.handle}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {platform}
                        </p>
                      </div>
                    </div>

                    {errors.length > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        {t("{count} errors", { count: errors.length })}
                      </Badge>
                    ) : null}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <SettingsComponent
                    account={account}
                    media={media}
                    value={settingsByAccountId[account.id]}
                    onChange={(nextValue) => onSettingsChange(account.id, nextValue)}
                    errors={errors}
                    storageProvider={storageProvider}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
