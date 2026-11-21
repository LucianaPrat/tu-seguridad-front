import { translate, type TranslationKey } from "@/lib/i18n"
import { useLocaleStore } from "@/stores/localeStore"

export function useT() {
  const locale = useLocaleStore((state) => state.locale)
  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars)
  return { t, locale }
}
