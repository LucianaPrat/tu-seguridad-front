import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "./App"
import { queryClient } from "@/lib/queryClient"
import { useSessionStore } from "@/stores/sessionStore"
import { mockFetchSequence } from "@/test/mockFetch"

/*
 * Smoke test for the provider chain and the guard redirects. App mounts
 * QueryClientProvider > AuthGate > BrowserRouter > routes, and nothing else
 * exercises that wiring — a missing provider only shows up at runtime.
 *
 * authStatus starts "ready" so the boot-time refresh stays disabled and the
 * guard cases render synchronously. The bootstrap cases below set it back to
 * "unknown" on purpose.
 */
beforeEach(() => {
  useSessionStore.setState({
    authStatus: "ready",
    accessToken: null,
    isLoggedIn: false,
    isDVRInit: false,
    user: null,
  })
  // App mounts the real singleton client, so a cached session query would be
  // replayed into the next test instead of re-running the bootstrap.
  queryClient.clear()
  window.history.pushState({}, "", "/")
})

describe("App", () => {
  it("mounts and lands a logged-out visitor on the login screen", () => {
    render(<App />)
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument()
  })

  it("sends an authenticated user without a DVR to onboarding", () => {
    useSessionStore.getState().login("luciana@example.com")

    render(<App />)

    expect(screen.getByRole("button", { name: "Conectar y continuar" })).toBeInTheDocument()
  })

  it("lets an authenticated user with a DVR reach the dashboard", () => {
    useSessionStore.getState().login("luciana@example.com")
    useSessionStore.getState().initDVR("Mi casa")

    render(<App />)

    expect(screen.queryByRole("button", { name: "Ingresar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Conectar y continuar" })).not.toBeInTheDocument()
  })

  it("redirects an unknown path back through the guard chain", () => {
    window.history.pushState({}, "", "/no-such-page")

    render(<App />)

    expect(screen.getByRole("button", { name: "Ingresar" })).toBeInTheDocument()
  })
})

describe("App session bootstrap", () => {
  beforeEach(() => {
    useSessionStore.setState({ authStatus: "unknown" })
  })

  it("restores the session from the refresh cookie before rendering routes", async () => {
    mockFetchSequence([
      { body: { accessToken: "atoken" } },
      { body: { id: 1, email: "admin@tu-seguridad.local", role: "admin" } },
    ])

    render(<App />)

    // No DVR yet, so a restored session lands on onboarding — and never
    // flashes the login screen on the way.
    expect(await screen.findByRole("button", { name: "Conectar y continuar" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ingresar" })).not.toBeInTheDocument()
    expect(useSessionStore.getState().accessToken).toBe("atoken")
  })

  it("falls through to the login screen when there is no cookie", async () => {
    mockFetchSequence([
      {
        status: 401,
        body: {
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Invalid or expired refresh token",
        },
      },
    ])

    render(<App />)

    expect(await screen.findByRole("button", { name: "Ingresar" })).toBeInTheDocument()
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
  })
})
