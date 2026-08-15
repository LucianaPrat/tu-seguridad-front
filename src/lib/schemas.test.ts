import { describe, expect, it } from "vitest"
import {
  dvrSchema,
  emailOnlySchema,
  loginSchema,
  passwordChangeSchema,
  profilePasswordSchema,
  registerSchema,
} from "./schemas"

/** First error message recorded for a field path, or undefined. */
function messageFor(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, field: string) {
  if (result.success) return undefined
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message
}

describe("loginSchema", () => {
  it("accepts a well-formed email and non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true)
  })

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" })
    expect(messageFor(result, "email")).toBe("Ingresá un email válido")
  })

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" })
    expect(messageFor(result, "password")).toBe("Ingresá tu contraseña")
  })
})

describe("registerSchema", () => {
  const valid = {
    firstName: "Luciana",
    lastName: "García",
    email: "a@b.com",
    phone: "+54 9 11 1234-5678",
    password: "hunter2hunter2",
    repeatPassword: "hunter2hunter2",
  }

  it("accepts a complete form", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it("flags mismatched passwords on the repeat field", () => {
    const result = registerSchema.safeParse({ ...valid, repeatPassword: "different" })
    expect(messageFor(result, "repeatPassword")).toBe("Las contraseñas no coinciden")
  })

  it("requires at least 8 password characters", () => {
    const result = registerSchema.safeParse({ ...valid, password: "short", repeatPassword: "short" })
    expect(messageFor(result, "password")).toBe("Mínimo 8 caracteres")
  })

  it("treats whitespace-only names as missing", () => {
    const result = registerSchema.safeParse({ ...valid, firstName: "   " })
    expect(messageFor(result, "firstName")).toBe("Requerido")
  })
})

describe("emailOnlySchema", () => {
  it("is shared by recovery and magic link", () => {
    expect(emailOnlySchema.safeParse({ email: "a@b.com" }).success).toBe(true)
    expect(emailOnlySchema.safeParse({ email: "nope" }).success).toBe(false)
  })
})

describe("passwordChangeSchema", () => {
  it("requires both entries to match", () => {
    const result = passwordChangeSchema.safeParse({ password: "hunter2hunter2", repeat: "other" })
    expect(messageFor(result, "repeat")).toBe("Las contraseñas no coinciden")
  })
})

describe("profilePasswordSchema", () => {
  it("requires the current password", () => {
    const result = profilePasswordSchema.safeParse({ current: "", next: "hunter2hunter2", repeat: "hunter2hunter2" })
    expect(messageFor(result, "current")).toBe("Requerido")
  })

  it("reports its own mismatch wording", () => {
    const result = profilePasswordSchema.safeParse({ current: "old", next: "hunter2hunter2", repeat: "typo" })
    expect(messageFor(result, "repeat")).toBe("No coincide")
  })
})

describe("dvrSchema", () => {
  const valid = {
    spaceName: "Mi casa",
    dvrUrl: "http://192.168.1.100:8080",
    dvrUser: "admin",
    dvrPassword: "secret",
    timezone: "America/Argentina/Buenos_Aires",
  }

  it("accepts a LAN URL", () => {
    expect(dvrSchema.safeParse(valid).success).toBe(true)
  })

  it("uses combobox wording when the timezone is missing", () => {
    const result = dvrSchema.safeParse({ ...valid, timezone: "" })
    expect(messageFor(result, "timezone")).toBe("Seleccioná una zona horaria")
  })

  it("still accepts a bare host, since operators point this at recorders", () => {
    expect(dvrSchema.safeParse({ ...valid, dvrUrl: "192.168.1.100" }).success).toBe(true)
  })
})
