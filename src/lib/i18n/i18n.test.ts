import { describe, expect, it } from "vitest"
import { dateLocale, isTranslationKey, translate } from "."
import { en } from "./en"
import { es } from "./es"

describe("i18n", () => {
  it("replaces {name} placeholders and leaves unknown ones alone", () => {
    expect(translate("es", "cameras.dashboard.subtitle", { count: 3 })).toBe("3 cámaras activas")
    expect(translate("en", "cameras.dashboard.subtitle", { count: 3 })).toBe("3 active cameras")
    expect(translate("en", "members.expires", {})).toBe("Expires {date}")
  })

  it("recognises dictionary keys only", () => {
    expect(isTranslationKey("validation.emailInvalid")).toBe(true)
    expect(isTranslationKey("Ingresá un email válido")).toBe(false)
    expect(isTranslationKey("toString")).toBe(false)
  })

  it("has a non-empty English value for every Spanish key", () => {
    for (const key of Object.keys(es)) {
      expect(en[key as keyof typeof es], key).toBeTruthy()
    }
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort())
  })

  it("keeps the same placeholders in both languages", () => {
    const names = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort()
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect(names(en[key]), key).toEqual(names(es[key]))
    }
  })

  it("maps locales to Intl tags", () => {
    expect(dateLocale("es")).toBe("es-AR")
    expect(dateLocale("en")).toBe("en-US")
  })
})
