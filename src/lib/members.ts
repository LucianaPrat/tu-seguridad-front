import { translate } from "@/lib/i18n"
import { MENU_KEYS, type MenuKey } from "@/lib/permissions"
import { useLocaleStore } from "@/stores/localeStore"
import type { MemberResponse, SpaceRole } from "@/lib/schemas"

/*
 * An invitation that was accepted but never finished carries empty strings in
 * firstName, lastName and phone — profileCompleted is what flags it. The email
 * column already identifies such a row, so the name cell says what is missing
 * instead of repeating the address.
 */
export function displayName(member: MemberResponse) {
  const name = `${member.firstName} ${member.lastName}`.trim()
  return name || translate(useLocaleStore.getState().locale, "members.noName")
}

export function initials(member: MemberResponse) {
  const letters = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`
  return letters || member.email[0].toUpperCase()
}

export function accessSummary({
  role,
  menuAccess = [],
  cameraIds = [],
}: {
  role: SpaceRole
  menuAccess?: MenuKey[]
  cameraIds?: string[]
}): string {
  const locale = useLocaleStore.getState().locale
  if (role === "admin") return translate(locale, "members.access.all")
  if (role === "guest") {
    return translate(locale, "members.access.cameras", { count: cameraIds.length })
  }
  return translate(locale, "members.access.sections", {
    count: menuAccess.length,
    total: MENU_KEYS.length,
  })
}
