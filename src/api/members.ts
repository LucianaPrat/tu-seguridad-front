import { request } from "@/lib/http"
import { memberListResponseSchema, memberResponseSchema } from "@/lib/schemas"
import type { MemberListResponse, MemberResponse } from "@/lib/schemas"

/**
 * The whole roster of the caller's space, inactive members included — the
 * screen renders the state as a badge, so hiding them would turn the column
 * into an omission. No pagination on the route, so there is nothing to pass.
 */
export async function listMembers(): Promise<MemberListResponse> {
  return memberListResponseSchema.parse(await request<unknown>("/members"))
}

/**
 * Admin only. Flips the per-member alert opt-in; the member row is otherwise
 * untouched and comes back as it now stands.
 */
export async function setMemberAlerts(
  userId: number,
  receiveAlerts: boolean,
): Promise<MemberResponse> {
  return memberResponseSchema.parse(
    await request<unknown>(`/members/${userId}`, {
      method: "PATCH",
      body: { receiveAlerts },
    }),
  )
}
