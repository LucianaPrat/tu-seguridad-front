import { beforeEach, describe, expect, it } from "vitest"
import { useSessionStore } from "./sessionStore"

// Zustand stores are module singletons, so state survives between tests.
const INITIAL = { isLoggedIn: false, isDVRInit: false, user: null }

beforeEach(() => {
  useSessionStore.setState(INITIAL)
})

describe("sessionStore", () => {
  it("starts logged out with no user", () => {
    const state = useSessionStore.getState()
    expect(state.isLoggedIn).toBe(false)
    expect(state.isDVRInit).toBe(false)
    expect(state.user).toBeNull()
  })

  it("login sets a user and flips isLoggedIn", () => {
    useSessionStore.getState().login("someone@example.com")

    const state = useSessionStore.getState()
    expect(state.isLoggedIn).toBe(true)
    expect(state.user).not.toBeNull()
    expect(state.user?.spaceName).toBe("Mi Espacio Seguro")
  })

  it("logout clears user and both flags", () => {
    useSessionStore.getState().login("someone@example.com")
    useSessionStore.getState().initDVR("Casa")

    useSessionStore.getState().logout()

    const state = useSessionStore.getState()
    expect(state.isLoggedIn).toBe(false)
    expect(state.isDVRInit).toBe(false)
    expect(state.user).toBeNull()
  })

  it("initDVR marks DVR ready and renames the space", () => {
    useSessionStore.getState().login("someone@example.com")
    useSessionStore.getState().initDVR("Depósito Norte")

    const state = useSessionStore.getState()
    expect(state.isDVRInit).toBe(true)
    expect(state.user?.spaceName).toBe("Depósito Norte")
  })

  it("initDVR without a user still flips the flag and leaves user null", () => {
    useSessionStore.getState().initDVR("Casa")

    const state = useSessionStore.getState()
    expect(state.isDVRInit).toBe(true)
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
})
