import { create } from "zustand"
import { isLocale, type Locale } from "@/lib/i18n"

const STORAGE_KEY = "locale"

function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Storage blocked: fall through to the browser language.
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "es"
}

function applyLang(locale: Locale) {
  document.documentElement.lang = locale
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Not persisted; still applies for this session.
    }
    applyLang(locale)
    set({ locale })
  },
}))

applyLang(useLocaleStore.getState().locale)
