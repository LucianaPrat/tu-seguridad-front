import type { CurrentSpace, MeResponse } from "@/lib/schemas"
import { MENU_KEYS } from "@/lib/permissions"

export function currentSpace(overrides: Partial<CurrentSpace> = {}): CurrentSpace {
  return {
    id: "space-1",
    name: "Mi Espacio Seguro",
    role: "admin",
    menuAccess: [...MENU_KEYS],
    cameraIds: [],
    hasDvr: true,
    ...overrides,
  }
}

/*
 * GET /auth/me, the full profile. Every test that mocks a session needs the
 * whole shape now that meSchema parses it — a partial body fails at the
 * boundary and drops the session instead of failing the assertion.
 */
export function meResponse(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: 1,
    email: "admin@tu-seguridad.local",
    firstName: "Luciana",
    lastName: "García",
    phone: "+5491112345678",
    avatarUrl: null,
    isActive: true,
    profileCompleted: true,
    spaces: [{ id: "space-1", name: "Mi Espacio Seguro", role: "admin" }],
    currentSpace: currentSpace(),
    pendingInvitationsCount: 0,
    receiveAlerts: true,
    locale: "es",
    ...overrides,
  }
}
