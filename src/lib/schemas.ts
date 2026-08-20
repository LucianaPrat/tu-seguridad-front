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
 * dvrUrl mirrors ConfigureDvrDto.url on the backend — @Matches(/^https?:\/\/\S+$/)
 * — rather than z.url(), which would reject the LAN shapes operators type. The
 * wizard PUTs this now, so a scheme-less host would come back as a generic 400
 * under the form instead of an error next to the field.
 */
export const dvrSchema = z.object({
  spaceName: required(),
  dvrUrl: required().regex(/^https?:\/\/\S+$/, "Debe empezar con http:// o https://"),
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

/*
 * GET /dvr and PUT /dvr answer with this. Only the fields the UI reads are
 * listed — zod strips the rest (lastTestAt, timestamps).
 */
export const dvrResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  username: z.string(),
  timezone: z.string(),
  cameraCount: z.number(),
})
export type DvrResponse = z.infer<typeof dvrResponseSchema>

/*
 * GET /cameras and GET /cameras/:id. The API names alert levels in English
 * (`intruder` / `suspicious`); `src/api/cameras.ts` translates them to the
 * Spanish ones the UI speaks. Timestamps the page does not read are stripped.
 */
export const cameraResponseSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  name: z.string(),
  location: z.string().nullish(),
  status: z.enum(["online", "offline"]),
  isConfigured: z.boolean(),
  isEnabled: z.boolean(),
  monitorMode: z.enum(["full", "partial"]),
  alertType: z.enum(["intruder", "suspicious"]).nullish(),
  lastSnapshotAt: z.string().nullish(),
  latestSnapshotUrl: z.string().nullish(),
})
export type CameraResponse = z.infer<typeof cameraResponseSchema>

/** Rectangles are percent of frame, so they survive a resolution change. */
export const monitorZoneResponseSchema = z.object({
  id: z.string(),
  cameraId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  alertType: z.enum(["intruder", "suspicious"]),
})
export type MonitorZoneResponse = z.infer<typeof monitorZoneResponseSchema>

/** POST /cameras/:id/snapshots. `url` is the authenticated route for the bytes. */
export const snapshotResponseSchema = z.object({
  id: z.string(),
  cameraId: z.string(),
  url: z.string(),
  capturedAt: z.string(),
})
export type SnapshotResponse = z.infer<typeof snapshotResponseSchema>
