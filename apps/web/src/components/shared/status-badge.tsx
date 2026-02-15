"use client";

import { Badge } from "@/components/ui/badge";
import {
  getPostUiStatusConfig,
  withSemanticToneBadgeClass,
  type PostUiStatus,
} from "@/lib/design-system/status";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status: PostUiStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useI18n();
  const config = getPostUiStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "border text-xs capitalize",
        withSemanticToneBadgeClass(config.tone),
        className
      )}
    >
      {t(config.label)}
    </Badge>
  );
}
