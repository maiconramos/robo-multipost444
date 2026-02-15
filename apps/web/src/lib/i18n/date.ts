import { format } from "date-fns/format";
import { enUS, ptBR } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { AppLocale } from "@/lib/i18n";

export function getDateFnsLocale(locale: AppLocale): Locale {
  return locale === "pt-BR" ? ptBR : enUS;
}

export function formatWithLocale(date: Date, formatString: string, locale: AppLocale): string {
  return format(date, formatString, {
    locale: getDateFnsLocale(locale),
  });
}

export function getIntlLocale(locale: AppLocale): string {
  return locale === "pt-BR" ? "pt-BR" : "en-US";
}
