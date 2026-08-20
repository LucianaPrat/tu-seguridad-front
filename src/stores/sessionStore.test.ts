import { beforeEach, describe, expect, it } from "vitest"
import { useSessionStore } from "./sessionStore"

// Zustand stores are module singletons, so state survives between tests.
const INITIAL = {
  authStatus: "unknown" as const,
  accessToken: null,
  isLoggedIn: false,
  user: null,
}

beforeEach(() => {
  useSessionStore.setState(INITIAL)
})

describe("sessionStore", () => {
  it("starts logged out with no user", () => {
    const state = useSessionStore.getState()
    expect(state.isLoggedIn).toBe(false)
    expect(state.user).toBeNull()
  })

  it("login sets a user and flips isLoggedIn", () => {
    useSessionStore.getState().login("someone@example.com")

    const state = useSessionStore.getState()
    expect(state.isLoggedIn).toBe(true)
    expect(state.user).not.toBeNull()
    expect(state.user?.spaceName).toBe("Mi Espacio Seguro")
  })

  it("logout clears user and session flags", () => {
    useSessionStore.getState().login("someone@example.com")

    useSessionStore.getState().logout()

    const state = useSessionStore.getState()
    expect(state.isLoggedIn).toBe(false)
    expect(state.user).toBeNull()
  })

  it("updateUser merges a partial patch", () => {
    useSessionStore.getState().login("someone@example.com")
    const before = useSessionStore.getState().user

    useSessionStore.getState().updateUser({ firstName: "Paulina" })

    const after = useSessionStore.getState().user
    expect(after?.firstName).toBe("Paulina")
    expect(after?.lastName).toBe(before?.lastName)
  })

  it("updateUser is a no-op while no user is loaded", () => {
    useSessionStore.getState().updateUser({ firstName: "Paulina" })
    expect(useSessionStore.getState().user).toBeNull()
  })

  describe("real auth", () => {
    it("setAccessToken holds the token without logging anyone in", () => {
      useSessionStore.getState().setAccessToken("atoken")

      const state = useSessionStore.getState()
      expect(state.accessToken).toBe("atoken")
      expect(state.isLoggedIn).toBe(false)
    })

    it("setSession builds the user off the API profile", () => {
      useSessionStore.getState().setSession({
        id: 42,
        email: "admin@tu-seguridad.local",
        role: "admin",
      })

      const state = useSessionStore.getState()
      expect(state.isLoggedIn).toBe(true)
      expect(state.authStatus).toBe("ready")
      // Member.id is a string; the API sends a number.
      expect(state.user?.id).toBe("42")
      expect(state.user?.email).toBe("admin@tu-seguridad.local")
      expect(state.user?.role).toBe("admin")
      // Display-only fields the API has no column for stay fixture-backed.
      expect(state.user?.spaceName).toBe("Mi Espacio Seguro")
    })

    it("logout clears the access token and settles authStatus", () => {
      useSessionStore.getState().setAccessToken("atoken")
      useSessionStore.getState().setSession({ id: 1, email: "a@a.com", role: "admin" })

      useSessionStore.getState().logout()

      const state = useSessionStore.getState()
      expect(state.accessToken).toBeNull()
      expect(state.isLoggedIn).toBe(false)
      expect(state.authStatus).toBe("ready")
    })

    it("setAuthReady opens the gate without granting a session", () => {
      useSessionStore.getState().setAuthReady()

      const state = useSessionStore.getState()
      expect(state.authStatus).toBe("ready")
      expect(state.isLoggedIn).toBe(false)
    })
  })
})
