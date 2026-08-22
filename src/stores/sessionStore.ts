import { create } from "zustand"
import type { MeResponse } from "@/lib/schemas"

/** GET /auth/me is the whole session identity — no fields added on the client. */
export type SessionUser = MeResponse

/** "unknown" until the boot-time refresh settles. Guards must not run before then. */
export type AuthStatus = "unknown" | "ready"

interface SessionState {
  authStatus: AuthStatus
  accessToken: string | null
  isLoggedIn: boolean
  user: SessionUser | null
  login: (email: string) => void
  setAccessToken: (token: string | null) => void
  setSession: (profile: MeResponse) => void
  setAuthReady: () => void
  logout: () => void
  updateUser: (data: Partial<SessionUser>) => void
}

/*
 * The access token lives here and nowhere else — no localStorage, no cookie a
 * script can read. It dies with the tab; the HttpOnly refresh cookie is what
 * survives a reload, replayed by useSessionBootstrap.
 *
 * FIXTURE_USER exists for login() alone — register and Face-Auth have no
 * endpoint yet. `profileCompleted: true` is load-bearing: those paths hold no
 * real profile, and a false flag would park them on the profile form.
 */
const FIXTURE_USER: SessionUser = {
  id: 0,
  email: "luciana@ejemplo.com",
  firstName: "Luciana",
  lastName: "García",
  phone: "+54 9 11 1234-5678",
  avatarUrl: null,
  isActive: true,
  profileCompleted: true,
  spaceId: "",
  spaceName: "Mi Espacio Seguro",
  role: "admin",
  receiveAlerts: true,
}

export const useSessionStore = create<SessionState>((set) => ({
  authStatus: "unknown",
  accessToken: null,
  isLoggedIn: false,
  user: null,

  /*
   * Fixture path, still used by register, magic link and Face-Auth — none of
   * those have a backend endpoint yet. Real credentials go through
   * setAccessToken + setSession instead.
   */
  login: (_email) => set({ authStatus: "ready", isLoggedIn: true, user: FIXTURE_USER }),

  setAccessToken: (token) => set({ accessToken: token }),

  setSession: (profile) => set({ authStatus: "ready", isLoggedIn: true, user: profile }),

  setAuthReady: () => set({ authStatus: "ready" }),

  logout: () =>
    set({
      authStatus: "ready",
      accessToken: null,
      isLoggedIn: false,
      user: null,
    }),

  updateUser: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : state.user,
    })),
}))
