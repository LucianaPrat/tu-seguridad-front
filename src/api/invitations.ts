import { request } from "@/lib/http"
import {
  accessTokenSchema,
  invitationListResponseSchema,
  invitationPreviewSchema,
  invitationResponseSchema,
  myInvitationSchema,
} from "@/lib/schemas"
import type { Locale } from "@/lib/i18n"
import type { MenuKey } from "@/lib/permissions"
import type {
  InvitationListResponse,
  InvitationPreview,
  InvitationResponse,
  MyInvitation,
  SpaceRole,
} from "@/lib/schemas"

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

/** Public: the invitee may have no session, so the link token is the credential. */
export async function previewInvitation(token: string): Promise<InvitationPreview> {
  return invitationPreviewSchema.parse(
    await request<unknown>(`/invitations/preview?${new URLSearchParams({ token })}`, {
      auth: false,
    }),
  )
}

export async function listMyInvitations(): Promise<MyInvitation[]> {
  return myInvitationSchema.array().parse(await request<unknown>("/invitations/mine"))
}

/** Joins the space and moves the session there: the answer is the new access token. */
export async function acceptInvitation(id: string): Promise<string> {
  const data = await request<unknown>(`/invitations/${id}/accept`, { method: "POST" })
  return accessTokenSchema.parse(data).accessToken
}

export async function declineInvitation(id: string): Promise<void> {
  await request<void>(`/invitations/${id}/decline`, { method: "POST" })
}
