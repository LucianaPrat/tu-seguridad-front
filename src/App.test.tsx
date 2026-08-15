import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import App from "./App"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Smoke test for the provider chain and the guard redirects. App mounts
 * QueryClientProvider > BrowserRouter > routes, and nothing else exercises
 * that wiring — a missing provider only shows up at runtime.
 */
beforeEach(() => {
  useSessionStore.setState({ isLoggedIn: false, isDVRInit: false, user: null })
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
