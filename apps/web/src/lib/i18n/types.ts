export type AppLocale = "pt-BR" | "en";

export const DEFAULT_LOCALE: AppLocale = "pt-BR";
export const SUPPORTED_LOCALES: AppLocale[] = ["pt-BR", "en"];

export type TranslationParams = Record<string, string | number>;
