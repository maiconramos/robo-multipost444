import { enMessages } from "@/lib/i18n/messages/en";
import { ptBRMessages } from "@/lib/i18n/messages/pt-BR";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type AppLocale, type TranslationParams } from "@/lib/i18n/types";

const dictionaries: Record<AppLocale, Record<string, string>> = {
  "pt-BR": ptBRMessages,
  en: enMessages,
};

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function resolveLocale(locale: string | null | undefined): AppLocale {
  if (!locale) {
    return DEFAULT_LOCALE;
  }

  if (SUPPORTED_LOCALES.includes(locale as AppLocale)) {
    return locale as AppLocale;
  }

  return DEFAULT_LOCALE;
}

export function translate(locale: AppLocale, key: string, params?: TranslationParams): string {
  const value = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  return interpolate(value, params);
}

export function createTranslator(locale: AppLocale) {
  return (key: string, params?: TranslationParams) => translate(locale, key, params);
}

export function hasTranslation(locale: AppLocale, key: string): boolean {
  return key in dictionaries[locale];
}

export { translateErrorMessage } from "@/lib/i18n/error";
export type { AppLocale, TranslationParams } from "@/lib/i18n/types";
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n/types";
