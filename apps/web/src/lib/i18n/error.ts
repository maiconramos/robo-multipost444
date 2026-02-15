import type { TranslationParams } from "@/lib/i18n";

type Translator = (key: string, params?: TranslationParams) => string;

export function translateErrorMessage(
  error: unknown,
  t: Translator,
  fallbackKey: string
): string {
  if (error instanceof Error) {
    const message = error.message?.trim();
    if (message) {
      return t(message);
    }
  }

  return t(fallbackKey);
}
