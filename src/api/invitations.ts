import { request } from "@/lib/http"
import {
  accessTokenSchema,
  invitationListResponseSchema,
  invitationResponseSchema,
} from "@/lib/schemas"
import type { InvitationListResponse, InvitationResponse } from "@/lib/schemas"

/**
 * Admin only. A 409 means the address already belongs to the space or already
 * has a pending invitation — a normal outcome the caller shows to the operator.
 */
export async function createInvitation(email: string): Promise<InvitationResponse> {
  return invitationResponseSchema.parse(
    await request<unknown>("/invitations", { method: "POST", body: { email } }),
  )
}

/** Admin only, pending only: accepted and expired invitations are not listed. */
export async function listPendingInvitations(): Promise<InvitationListResponse> {
  return invitationListResponseSchema.parse(await request<unknown>("/invitations"))
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
