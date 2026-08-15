import { z } from "zod"

/*
 * Single home for form validation. Messages are user-facing Spanish and are
 * rendered straight from the resolver, so keep them phrased for end users.
 */

const emailField = z.email("Ingresá un email válido")
const strongPassword = z.string().min(8, "Mínimo 8 caracteres")

function required(message = "Requerido") {
  return z.string().trim().min(1, message)
}

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Ingresá tu contraseña"),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    firstName: required(),
    lastName: required(),
    email: emailField,
    phone: required(),
    password: strongPassword,
    repeatPassword: z.string(),
  })
  .refine((values) => values.password === values.repeatPassword, {
    message: "Las contraseñas no coinciden",
    path: ["repeatPassword"],
  })
export type RegisterValues = z.infer<typeof registerSchema>

/** Shared by password recovery and magic link — both ask for an email only. */
export const emailOnlySchema = z.object({ email: emailField })
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>

export const passwordChangeSchema = z
  .object({
    password: strongPassword,
    repeat: z.string(),
  })
  .refine((values) => values.password === values.repeat, {
    message: "Las contraseñas no coinciden",
    path: ["repeat"],
  })
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>

export const profileSchema = z.object({
  firstName: required(),
  lastName: required(),
  email: emailField,
  phone: required(),
})
export type ProfileValues = z.infer<typeof profileSchema>

export const profilePasswordSchema = z
  .object({
    current: required(),
    next: strongPassword,
    repeat: z.string(),
  })
  .refine((values) => values.next === values.repeat, {
    message: "No coincide",
    path: ["repeat"],
  })
export type ProfilePasswordValues = z.infer<typeof profilePasswordSchema>

/*
 * dvrUrl stays a plain required string rather than z.url(). Operators point
 * this at LAN recorders, and tightening it here would reject shapes the old
 * form accepted. Revisit once the backend states what it accepts.
 */
export const dvrSchema = z.object({
  spaceName: required(),
  dvrUrl: required(),
  dvrUser: required(),
  dvrPassword: required(),
  timezone: required("Seleccioná una zona horaria"),
})
export type DVRFormValues = z.infer<typeof dvrSchema>

export const inviteSchema = z.object({ email: emailField })
export type InviteValues = z.infer<typeof inviteSchema>

/*
 * API response shapes. Parsed, not cast: a backend that drifts should fail
 * loudly at the boundary instead of leaking undefined into the store.
 * The refresh token is absent on purpose — it lives in an HttpOnly cookie.
 */
export const accessTokenSchema = z.object({ accessToken: z.string().min(1) })
export type AccessTokenResponse = z.infer<typeof accessTokenSchema>

export const meSchema = z.object({
  id: z.number(),
  email: z.email(),
  role: z.string(),
})
export type MeResponse = z.infer<typeof meSchema>
