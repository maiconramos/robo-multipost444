"use client";

import { useAccounts, type Account } from "@/hooks";
import { PlatformIcon } from "@/components/shared";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PlatformSelectorProps {
  selectedAccountIds: string[];
  onSelectionChange: (accountIds: string[]) => void;
  _hasVideo: boolean;
  _hasImages: boolean;
}

export function PlatformSelector({
  selectedAccountIds,
  onSelectionChange,
  _hasVideo,
  _hasImages,
}: PlatformSelectorProps) {
  const { t } = useI18n();
  const { data: accountsData, isLoading } = useAccounts();
  const accounts = (accountsData?.accounts || []) as Account[];

  const toggleAccount = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onSelectionChange(
        selectedAccountIds.filter((selectedId) => selectedId !== accountId),
      );
    } else {
      onSelectionChange([...selectedAccountIds, accountId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">
          {t("No accounts connected.")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <TooltipProvider delayDuration={0}>
          {accounts.map((account) => {
            const isSelected = selectedAccountIds.includes(account._id);

            return (
              <Tooltip key={account._id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => toggleAccount(account._id)}
                    className={cn(
                      "relative group flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 outline-none",
                      isSelected
                        ? "grayscale-0 opacity-100 scale-105"
                        : "grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
                    )}
                  >
                    <Avatar className="h-12 w-12 border border-border/50">
                      <AvatarImage src={account.profilePicture} alt={account.displayName || account.username} />
                      <AvatarFallback>{(account.displayName || account.username || "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>

                    {/* Platform Badge */}
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-background">
                      <PlatformIcon
                        platform={account.platform as any}
                        size="sm"
                        showColor
                      />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-semibold">{account.displayName || account.username}</p>
                  <p className="text-muted-foreground capitalize">{account.platform}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Add Account Button (Placeholder logic, or link to settings) */}
          {/* 
           <Tooltip>
                <TooltipTrigger asChild>
                    <button className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 hover:bg-muted transition-colors">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <p>{t("Connect new account")}</p>
                </TooltipContent>
           </Tooltip>
           */}
        </TooltipProvider>
      </div>

      {/* Helper text if needed */}
      {
        selectedAccountIds.length === 0 && (
          <p className="text-xs text-muted-foreground animate-pulse">
            {t("Select one or more accounts to post")}
          </p>
        )
      }
    </div >
  );
}
