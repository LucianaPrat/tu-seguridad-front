import type { TranslationKey } from "@/lib/i18n"
import type { MeResponse, SpaceRole } from "@/lib/schemas"
import { useSessionStore } from "@/stores/sessionStore"

/** Mirrors MENU_KEYS in tu-seguridad-back/src/cross/common/permissions.ts. Profile and help are always visible. */
export const MENU_KEYS = ["home", "monitor", "events", "dvr", "channels", "members"] as const
export type MenuKey = (typeof MENU_KEYS)[number]

/** Where each section lives. RequireMenu's fallback and the tour read it. */
export const MENU_ROUTES: Record<MenuKey, string> = {
  home: "/",
  monitor: "/cameras/monitor",
  events: "/events",
  dvr: "/dvr-config",
  channels: "/channels",
  members: "/members",
}

/** Mirrors DEFAULT_MENU_ACCESS in tu-seguridad-back/src/cross/common/permissions.ts. */
export const DEFAULT_MENU_ACCESS: Record<SpaceRole, MenuKey[]> = {
  admin: [...MENU_KEYS],
  collaborator: ["home", "monitor", "events", "dvr", "channels"],
  guest: ["home", "monitor"],
}

export const MENU_LABELS: Record<MenuKey, TranslationKey> = {
  home: "nav.home",
  monitor: "nav.monitoring",
  events: "nav.events",
  dvr: "nav.dvr",
  channels: "nav.channels",
  members: "nav.members",
}

export const ROLE_LABELS: Record<SpaceRole, TranslationKey> = {
  admin: "role.admin",
  collaborator: "role.collaborator",
  guest: "role.guest",
}

type Space = MeResponse["currentSpace"]

/** Admin sees everything; everyone else sees what menuAccess grants. */
export function canView(space: Space, key: MenuKey): boolean {
  if (!space) return false
  return space.role === "admin" || space.menuAccess.includes(key)
}

/** Back rule for config writes: admin or collaborator, and the section granted. */
export function canEdit(space: Space, key: MenuKey): boolean {
  return space !== null && space.role !== "guest" && canView(space, key)
}

export function useCan() {
  const space = useSessionStore((state) => state.user?.currentSpace ?? null)
  return {
    canView: (key: MenuKey) => canView(space, key),
    canEdit: (key: MenuKey) => canEdit(space, key),
    isAdmin: space?.role === "admin",
    /** Not-implemented controls: admin sees them disabled, other roles do not see them. No session (auth pages) = show. */
    showNotImplemented: !space || space.role === "admin",
  }
}
