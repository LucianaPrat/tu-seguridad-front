import type { MeResponse } from "@/lib/schemas"

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
    spaceId: "space-1",
    spaceName: "Mi Espacio Seguro",
    role: "admin",
    receiveAlerts: true,
    ...overrides,
  }
}
