import { z } from "zod"
import { MENU_KEYS } from "@/lib/permissions"

/*
 * Single home for form validation. Messages are translation keys (src/lib/i18n),
 * resolved at render by FormField, so keep the dictionary phrased for end users.
 */

const emailField = z.email("validation.emailInvalid")
const strongPassword = z.string().min(8, "validation.min8")

function required(message = "validation.required") {
  return z.string().trim().min(1, message)
}

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "validation.passwordRequired"),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    firstName: required(),
    lastName: required(),
    email: emailField,
    // Backend rules: E.164 phone, 12-char password minimum.
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "validation.phoneFormat"),
    password: z.string().min(12, "validation.min12"),
    repeatPassword: z.string(),
  })
  .refine((values) => values.password === values.repeatPassword, {
    message: "validation.passwordMismatch",
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
    message: "validation.passwordMismatch",
    path: ["repeat"],
  })
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>

export const profileSchema = z.object({
  firstName: required(),
  lastName: required(),
  // Email is not editable. E.164, same rule the backend enforces.
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "validation.phoneFormat"),
})
export type ProfileValues = z.infer<typeof profileSchema>

export const profilePasswordSchema = z
  .object({
    current: required(),
    next: strongPassword,
    repeat: z.string(),
  })
  .refine((values) => values.next === values.repeat, {
    message: "validation.noMatch",
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
  dvrUrl: required().regex(/^https?:\/\/\S+$/, "validation.urlScheme"),
  dvrUser: required(),
  dvrPassword: required(),
  timezone: required("validation.selectTimezone"),
})
export type DVRFormValues = z.infer<typeof dvrSchema>

export const inviteSchema = z.object({ email: emailField })
export type InviteValues = z.infer<typeof inviteSchema>

/** POST /spaces and PATCH /spaces/current: trimmed, 1..80 (SpaceNameDto). */
export const spaceNameSchema = z.object({ name: required().max(80, "validation.max80") })
export type SpaceNameValues = z.infer<typeof spaceNameSchema>

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
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "validation.phoneFormat"),
    password: z.string().min(12, "validation.min12"),
    repeatPassword: z.string(),
  })
  .refine((values) => values.password === values.repeatPassword, {
    message: "validation.passwordMismatch",
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

const spaceRoleSchema = z.enum(["admin", "collaborator", "guest"])
export type SpaceRole = z.infer<typeof spaceRoleSchema>
const spaceSummarySchema = z.object({ id: z.string(), name: z.string(), role: spaceRoleSchema })

export const meSchema = z.object({
  id: z.number(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  avatarUrl: z.string().nullable(),
  isActive: z.boolean(),
  profileCompleted: z.boolean(),
  spaces: z.array(spaceSummarySchema),
  currentSpace: spaceSummarySchema
    .extend({
      menuAccess: z.array(z.enum(MENU_KEYS)),
      cameraIds: z.array(z.string()),
      hasDvr: z.boolean(),
    })
    .nullable(),
  pendingInvitationsCount: z.number(),
  receiveAlerts: z.boolean(),
  locale: z.enum(["es", "en"]),
})
export type MeResponse = z.infer<typeof meSchema>
export type CurrentSpace = NonNullable<MeResponse["currentSpace"]>

/** GET /invitations/mine, one row. */
export const myInvitationSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  spaceName: z.string(),
  invitedByName: z.string(),
  role: spaceRoleSchema,
  expiresAt: z.string(),
})
export type MyInvitation = z.infer<typeof myInvitationSchema>

/** GET /invitations/preview. Public; 404 for any invitation no longer pending. */
export const invitationPreviewSchema = myInvitationSchema
  .omit({ spaceId: true })
  .extend({ email: z.string(), userExists: z.boolean() })
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>

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
  role: spaceRoleSchema,
  menuAccess: z.array(z.enum(MENU_KEYS)),
  cameraIds: z.array(z.string()),
  expiresAt: z.string(),
  createdAt: z.string(),
})
export type InvitationResponse = z.infer<typeof invitationResponseSchema>

/** GET /invitations: pending only, members section. */
export const invitationListResponseSchema = z.object({
  items: invitationResponseSchema.array(),
  total: z.number(),
})
export type InvitationListResponse = z.infer<typeof invitationListResponseSchema>

/*
 * GET /members. One row of the roster: `role` always comes back, `menuAccess`
 * and `cameraIds` only when the caller is an admin. `firstName`, `lastName` and `phone`
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
  receiveAlerts: z.boolean(),
  role: spaceRoleSchema,
  /** Only when the caller is an admin. */
  menuAccess: z.array(z.enum(MENU_KEYS)).optional(),
  cameraIds: z.array(z.string()).optional(),
})
export type MemberResponse = z.infer<typeof memberResponseSchema>

export const memberListResponseSchema = z.object({
  items: memberResponseSchema.array(),
  total: z.number(),
})
export type MemberListResponse = z.infer<typeof memberListResponseSchema>

/*
 * GET/PUT /alert-routings. Always the full alert type x channel grid, six
 * cells, even for a space that never wrote any of them. English on both axes;
 * `src/api/channels.ts` translates to the Spanish names the UI uses.
 */
export const alertRoutingResponseSchema = z.object({
  alertType: z.enum(["intruder", "suspicious"]),
  channel: z.enum(["call", "whatsapp", "email"]),
  enabled: z.boolean(),
})
export type AlertRoutingResponse = z.infer<typeof alertRoutingResponseSchema>

export const alertRoutingListResponseSchema = z.object({
  items: alertRoutingResponseSchema.array(),
})
export type AlertRoutingListResponse = z.infer<typeof alertRoutingListResponseSchema>

/*
 * GET /events. Keyset paged, newest first — `nextCursor` is opaque and only
 * ever travels back as `?cursor=`, so nothing here parses it. English enums on
 * the wire; `src/api/events.ts` translates to the Spanish names the UI uses.
 * `channels` is the distinct set of channels the alert's deliveries used, empty
 * while no delivery was planned yet.
 */
export const alertEventResponseSchema = z.object({
  id: z.string(),
  cameraId: z.string().nullable(),
  zoneId: z.string().nullable(),
  cameraLabel: z.string(),
  alertType: z.enum(["intruder", "suspicious"]),
  channels: z.enum(["call", "whatsapp", "email"]).array(),
  detectedAt: z.string(),
  snapshotUrl: z.string().nullable(),
  personsDetected: z.number().nullable(),
  confidence: z.number().nullable(),
  acknowledgedAt: z.string().nullable(),
  acknowledgedByUserId: z.number().nullable(),
})
export type AlertEventResponse = z.infer<typeof alertEventResponseSchema>

export const alertEventPageResponseSchema = z.object({
  items: alertEventResponseSchema.array(),
  nextCursor: z.string().nullable(),
})
export type AlertEventPageResponse = z.infer<typeof alertEventPageResponseSchema>

/*
 * POST /assistant/chat. Nothing is stored server-side — every request carries
 * the whole conversation, so there is no id here to correlate with. `model` is
 * the deployment's configured model echoed back, so a swapped deployment is
 * visible in the answer.
 */
export const assistantChatResponseSchema = z.object({
  reply: z.string(),
  model: z.string(),
})
export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>

/*
 * POST /assistant/transcribe. Whisper answers the clip's text and nothing else;
 * an empty string is a valid answer (silence), not a failure the route reports.
 */
export const assistantTranscriptionResponseSchema = z.object({ text: z.string() })
export type AssistantTranscriptionResponse = z.infer<typeof assistantTranscriptionResponseSchema>
