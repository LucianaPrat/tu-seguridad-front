import { create } from "zustand"
import type { Member } from "@/data/mockData"
import { MEMBERS } from "@/data/mockData"
import type { MeResponse } from "@/lib/schemas"

export interface SessionUser extends Member {
  spaceName: string
  role: string
}

/** "unknown" until the boot-time refresh settles. Guards must not run before then. */
export type AuthStatus = "unknown" | "ready"

interface SessionState {
  authStatus: AuthStatus
  accessToken: string | null
  isLoggedIn: boolean
  isDVRInit: boolean
  user: SessionUser | null
  login: (email: string) => void
  setAccessToken: (token: string | null) => void
  setSession: (profile: MeResponse) => void
  setAuthReady: () => void
  logout: () => void
  initDVR: (spaceName: string) => void
  updateUser: (data: Partial<SessionUser>) => void
}

/*
 * The access token lives here and nowhere else — no localStorage, no cookie a
 * script can read. It dies with the tab; the HttpOnly refresh cookie is what
 * survives a reload, replayed by useSessionBootstrap.
 *
 * MOCK_USER still fills the display fields: the API's users table carries only
 * id, email and role, so name, phone, avatar and spaceName stay fixtures.
 */
const MOCK_USER: SessionUser = {
  ...MEMBERS[0],
  spaceName: "Mi Espacio Seguro",
  role: "admin",
}

export const useSessionStore = create<SessionState>((set) => ({
  authStatus: "unknown",
  accessToken: null,
  isLoggedIn: false,
  isDVRInit: false,
  user: null,

  /*
   * Fixture path, still used by register, magic link and Face-Auth — none of
   * those have a backend endpoint yet. Real credentials go through
   * setAccessToken + setSession instead.
   */
  login: (_email) => set({ authStatus: "ready", isLoggedIn: true, user: MOCK_USER }),

  setAccessToken: (token) => set({ accessToken: token }),

  setSession: (profile) =>
    set({
      authStatus: "ready",
      isLoggedIn: true,
      user: {
        ...MOCK_USER,
        // Member.id is a string, the API's is a number.
        id: String(profile.id),
        email: profile.email,
        role: profile.role,
      },
    }),

  setAuthReady: () => set({ authStatus: "ready" }),

  logout: () =>
    set({
      authStatus: "ready",
      accessToken: null,
      isLoggedIn: false,
      isDVRInit: false,
      user: null,
    }),

  initDVR: (spaceName) =>
    set((state) => ({
      isDVRInit: true,
      user: state.user ? { ...state.user, spaceName } : state.user,
    })),

  updateUser: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : state.user,
    })),
}))
