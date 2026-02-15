"use client";

import { Globe, Check } from "lucide-react";
import { useAppStore } from "@/stores";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { AppLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const localeOptions: Array<{ value: AppLocale; label: string }> = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "English" },
];

interface LanguageSwitcherProps {
  variant?: "ghost" | "outline";
  size?: "sm" | "default" | "icon";
  showLabel?: boolean;
}

export function LanguageSwitcher({
  variant = "outline",
  size = "sm",
  showLabel = true,
}: LanguageSwitcherProps) {
  const { locale, t } = useI18n();
  const setLanguage = useAppStore((state) => state.setLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Globe className="h-4 w-4" />
          {showLabel && <span>{t("Language")}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {localeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setLanguage(option.value)}
            className="gap-2"
          >
            <span className="flex-1">{t(option.label)}</span>
            {locale === option.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
