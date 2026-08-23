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
 * Mirrors CompleteProfileDto on the backend: E.164 phone and a 12-character
 * password floor. Both are checked here so a rejected profile is a field error
 * instead of a generic 400 under the form. `strongPassword` stays at 8 for the
 * screens still on fixtures.
 */
export const completeProfileSchema = z
  .object({
    firstName: required(),
    lastName: required(),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Usá formato internacional, ej +5491122334455"),
    password: z.string().min(12, "Mínimo 12 caracteres"),
    repeatPassword: z.string(),
  })
  .refine((values) => values.password === values.repeatPassword, {
    message: "Las contraseñas no coinciden",
    path: ["repeatPassword"],
  })
export type CompleteProfileValues = z.infer<typeof completeProfileSchema>

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
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  profileCompleted: z.boolean(),
  spaceId: z.string(),
  spaceName: z.string(),
  role: z.enum(["admin", "member"]),
  receiveAlerts: z.boolean(),
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

/**
 * Coordinates are percent of frame, so they survive a resolution change.
 * `points` is the outline the operator drew; the API answers the four corners
 * of the rectangle for a zone that was drawn as one, so it is always present.
 */
export const monitorZoneResponseSchema = z.object({
  id: z.string(),
  cameraId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).nullish(),
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

/**
 * GET /cameras/:id/live. `url` is not a secret: the media server asks this API
 * to authorize the playlist and every segment, so the player is what has to
 * carry the bearer token. `protocol` is a literal so a second transport lands
 * here as a parse failure rather than as a silently unplayable card.
 */
export const liveStreamResponseSchema = z.object({
  protocol: z.literal("hls"),
  url: z.string(),
})
export type LiveStreamResponse = z.infer<typeof liveStreamResponseSchema>

/** POST /invitations. The raw token is absent by design — it lives only in the
 * delivered link, so an admin reading this answer still cannot use it. */
export const invitationResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
})
export type InvitationResponse = z.infer<typeof invitationResponseSchema>

/** GET /invitations. Pending only, admin only. */
export const invitationListResponseSchema = z.object({
  items: invitationResponseSchema.array(),
  total: z.number(),
})
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>

/*
 * GET /members. One row of the roster: no role field — a member's role only
 * comes back for the caller, on /auth/me. `firstName`, `lastName` and `phone`
 * are empty strings for someone who accepted an invitation and never finished,
 * which is what `profileCompleted` flags.
 */
export const memberResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  profileCompleted: z.boolean(),
  lastLoginAt: z.string().nullable(),
})
export type MemberResponse = z.infer<typeof memberResponseSchema>

export const memberListResponseSchema = z.object({
  items: memberResponseSchema.array(),
  total: z.number(),
})
export type MemberListResponse = z.infer<typeof memberListResponseSchema>
