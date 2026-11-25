import { request } from "@/lib/http"
import {
  memberActivityResponseSchema,
  memberListResponseSchema,
  memberResponseSchema,
} from "@/lib/schemas"
import type { Locale } from "@/lib/i18n"
import type { MenuKey } from "@/lib/permissions"
import type {
  MemberActivityResponse,
  MemberListResponse,
  MemberResponse,
  SpaceRole,
} from "@/lib/schemas"

/**
 * The whole roster of the caller's space, inactive members included — the
 * screen renders the state as a badge, so hiding them would turn the column
 * into an omission. No pagination on the route, so there is nothing to pass.
 */
export async function listMembers(): Promise<MemberListResponse> {
  return memberListResponseSchema.parse(await request<unknown>("/members"))
}

export interface CreateMemberPayload {
  email: string
  role: SpaceRole
  /** Left out: the back applies the role defaults. */
  menuAccess?: MenuKey[]
  /** Left out: no cameras. */
  cameraIds?: string[]
  locale?: Locale
  /** Required by the back only when the email has no account yet; otherwise ignored. */
  firstName?: string
  lastName?: string
  phone?: string
  password?: string
}

/**
 * Admin only. Adds the member straight to the space, no invitation email. A 409
 * (already a member / pending invitation) and a 400 carry a message for the operator.
 */
export async function createMember(payload: CreateMemberPayload): Promise<MemberResponse> {
  return memberResponseSchema.parse(
    await request<unknown>("/members", { method: "POST", body: payload }),
  )
}

export interface UpdateMemberPayload {
  role?: SpaceRole
  menuAccess?: MenuKey[]
  cameraIds?: string[]
  receiveAlerts?: boolean
  /** Profile fields: 403 if the user belongs to other spaces; a new email logs them out everywhere. */
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
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

export type ActivityDays = 7 | 30 | 90

/** Admin only. Sessions and streaming minutes per day, plus the previous period's totals. */
export async function getMemberActivity(days: ActivityDays): Promise<MemberActivityResponse> {
  return memberActivityResponseSchema.parse(
    await request<unknown>(`/members/activity?days=${days}`),
  )
}
