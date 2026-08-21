import { request } from "@/lib/http"
import { invitationResponseSchema } from "@/lib/schemas"
import type { InvitationResponse } from "@/lib/schemas"

/**
 * Admin only. A 409 means the address already belongs to the space or already
 * has a pending invitation — a normal outcome the caller shows to the operator.
 */
export async function createInvitation(email: string): Promise<InvitationResponse> {
  return invitationResponseSchema.parse(
    await request<unknown>("/invitations", { method: "POST", body: { email } }),
  )
}
