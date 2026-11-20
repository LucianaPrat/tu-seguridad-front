import { request } from "@/lib/http"
import {
  accessTokenSchema,
  invitationListResponseSchema,
  invitationResponseSchema,
} from "@/lib/schemas"
import type { Locale } from "@/lib/i18n"
import type { MenuKey } from "@/lib/permissions"
import type { InvitationListResponse, InvitationResponse, SpaceRole } from "@/lib/schemas"

export interface CreateInvitationPayload {
  email: string
  role: SpaceRole
  /** Left out: the back applies the role defaults. */
  menuAccess?: MenuKey[]
  /** Left out: no cameras. */
  cameraIds?: string[]
  locale?: Locale
}

/**
 * Admin only. A 409 means the address already belongs to the space or already
 * has a pending invitation — a normal outcome the caller shows to the operator.
 */
export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<InvitationResponse> {
  return invitationResponseSchema.parse(
    await request<unknown>("/invitations", { method: "POST", body: payload }),
  )
}

/** Members section, pending only: accepted and expired invitations are not listed. */
export async function listPendingInvitations(): Promise<InvitationListResponse> {
  return invitationListResponseSchema.parse(await request<unknown>("/invitations"))
}

/** Admin only. */
export async function revokeInvitation(id: string): Promise<void> {
  await request<void>(`/invitations/${id}`, { method: "DELETE" })
}

/** Admin only. Answers the invitation with its new `expiresAt`. */
export async function resendInvitation(id: string): Promise<InvitationResponse> {
  return invitationResponseSchema.parse(
    await request<unknown>(`/invitations/${id}/resend`, { method: "POST" }),
  )
}

/*
 * Public on purpose: the invitee has no session yet, so the token from the
 * emailed link is the whole credential. Answers the access token and sets the
 * refresh cookie, exactly like a login. Single-use — a replay is a 401.
 */
export async function acceptInvitation(token: string): Promise<string> {
  const data = await request<unknown>("/invitations/accept", {
    method: "POST",
    body: { token },
    auth: false,
  })
  return accessTokenSchema.parse(data).accessToken
}
