"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores";
import { createTranslator, resolveLocale } from "@/lib/i18n";

export function useI18n() {
  const language = useAppStore((state) => resolveLocale(state.language));

  const t = useMemo(() => createTranslator(language), [language]);

  return {
    locale: language,
    t,
    isPortuguese: language === "pt-BR",
    isEnglish: language === "en",
  };
}
