import { es } from "./es"
import { en } from "./en"

export type Locale = "es" | "en"
export type TranslationKey = keyof typeof es

export const LOCALES: readonly Locale[] = ["es", "en"]

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { es, en }

export function isTranslationKey(value: string): value is TranslationKey {
  return Object.prototype.hasOwnProperty.call(es, value)
}

export function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en"
}

/** Looks the key up and replaces `{name}` placeholders from `vars`. */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const text = dictionaries[locale][key]
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export function dateLocale(locale: Locale): "es-AR" | "en-US" {
  return locale === "en" ? "en-US" : "es-AR"
}
