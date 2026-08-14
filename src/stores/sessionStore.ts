import { create } from "zustand"
import type { Member } from "@/data/mockData"
import { MEMBERS } from "@/data/mockData"

export interface SessionUser extends Member {
  spaceName: string
}

interface SessionState {
  isLoggedIn: boolean
  isDVRInit: boolean
  user: SessionUser | null
  login: (email: string) => void
  logout: () => void
  initDVR: (spaceName: string) => void
  updateUser: (data: Partial<SessionUser>) => void
}

/*
 * Still fixture-backed. Real auth lands here: login() will call the JWT
 * endpoint and hold the access token, refresh handled by the API client.
 * Keep tokens in this store, not in component state.
 */
const MOCK_USER: SessionUser = {
  ...MEMBERS[0],
  spaceName: "Mi Espacio Seguro",
}

export const useSessionStore = create<SessionState>((set) => ({
  isLoggedIn: false,
  isDVRInit: false,
  user: null,

  login: (_email) => set({ isLoggedIn: true, user: MOCK_USER }),

  logout: () => set({ isLoggedIn: false, isDVRInit: false, user: null }),

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
