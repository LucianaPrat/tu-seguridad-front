import type { MeResponse } from "@/lib/schemas"
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
  }
}
