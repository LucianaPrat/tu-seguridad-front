import type { MemberResponse } from "@/lib/schemas"

/*
 * An invitation that was accepted but never finished carries empty strings in
 * firstName, lastName and phone — profileCompleted is what flags it. The email
 * column already identifies such a row, so the name cell says what is missing
 * instead of repeating the address.
 */
export function displayName(member: MemberResponse) {
  const name = `${member.firstName} ${member.lastName}`.trim()
  return name || "Sin nombre"
}

export function initials(member: MemberResponse) {
  const letters = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`
  return letters || member.email[0].toUpperCase()
}
