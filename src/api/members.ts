import { request } from "@/lib/http"
import { memberListResponseSchema } from "@/lib/schemas"
import type { MemberListResponse } from "@/lib/schemas"

/**
 * The whole roster of the caller's space, inactive members included — the
 * screen renders the state as a badge, so hiding them would turn the column
 * into an omission. No pagination on the route, so there is nothing to pass.
 */
export async function listMembers(): Promise<MemberListResponse> {
  return memberListResponseSchema.parse(await request<unknown>("/members"))
}
