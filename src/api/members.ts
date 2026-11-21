import { request } from "@/lib/http"
import { memberListResponseSchema, memberResponseSchema } from "@/lib/schemas"
import type { MenuKey } from "@/lib/permissions"
import type { MemberListResponse, MemberResponse, SpaceRole } from "@/lib/schemas"

/**
 * The whole roster of the caller's space, inactive members included — the
 * screen renders the state as a badge, so hiding them would turn the column
 * into an omission. No pagination on the route, so there is nothing to pass.
 */
export async function listMembers(): Promise<MemberListResponse> {
  return memberListResponseSchema.parse(await request<unknown>("/members"))
}

export interface UpdateMemberPayload {
  role?: SpaceRole
  menuAccess?: MenuKey[]
  cameraIds?: string[]
  receiveAlerts?: boolean
}

/**
 * Admin only. Partial update; the member comes back as it now stands. A role
 * change without `menuAccess` resets it to the new role's defaults.
 */
export async function updateMember(
  userId: number,
  patch: UpdateMemberPayload,
): Promise<MemberResponse> {
  return memberResponseSchema.parse(
    await request<unknown>(`/members/${userId}`, { method: "PATCH", body: patch }),
  )
}

/** Admin only. Removing yourself is a 409. */
export async function removeMember(userId: number): Promise<void> {
  await request<void>(`/members/${userId}`, { method: "DELETE" })
}
