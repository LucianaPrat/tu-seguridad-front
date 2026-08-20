import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App, { AppRoutes } from "./App"
import { queryClient } from "@/lib/queryClient"
import { useSessionStore } from "@/stores/sessionStore"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"

/** GET /dvr answers 404 while the space has never configured a recorder. */
const NO_DVR = {
  status: 404,
  body: { statusCode: 404, code: "NOT_FOUND", message: "Dvr not found" },
}

const DVR = {
  body: {
    id: "dvr-1",
    url: "http://192.168.1.10:8000",
    username: "admin",
    timezone: "America/Argentina/Buenos_Aires",
    cameraCount: 4,
  },
}

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

  it("sends an authenticated user with no stored DVR to onboarding", async () => {
    mockFetchSequence([NO_DVR])
    useSessionStore.getState().login("luciana@example.com")

    render(<App />)

    expect(await screen.findByRole("button", { name: "Conectar y continuar" })).toBeInTheDocument()
  })

  it("lets an authenticated user with a stored DVR reach the dashboard", async () => {
    mockFetchSequence([DVR])
    useSessionStore.getState().login("luciana@example.com")

    render(<App />)

    // The wizard must never appear once the backend has a recorder — that was
    // the bug: an in-memory flag sent every fresh login back to onboarding.
    expect(await screen.findByText("Panel de cámaras")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ingresar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Conectar y continuar" })).not.toBeInTheDocument()
  })

  /* Mirror of the case above: the wizard cannot be reached by typing the URL
     once a recorder is stored, or a re-visit offers to overwrite it. */
  it("bounces a stored-DVR user off the onboarding wizard", async () => {
    mockFetchSequence([DVR])
    useSessionStore.getState().login("luciana@example.com")
    window.history.pushState({}, "", "/onboarding/dvr")

    render(<App />)

    expect(await screen.findByText("Panel de cámaras")).toBeInTheDocument()
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
      NO_DVR,
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

/*
 * Rendered through renderWithProviders rather than App: the test client has
 * retries off, so a deliberate 500 fails once instead of after a backoff.
 */
describe("DVR gate on a failed read", () => {
  it("shows the notice instead of offering to overwrite the recorder", async () => {
    mockFetchSequence([
      { status: 500, body: { statusCode: 500, code: "INTERNAL_ERROR", message: "boom" } },
    ])
    useSessionStore.getState().login("luciana@example.com")

    renderWithProviders(<AppRoutes />, { route: "/" })

    expect(await screen.findByText(/No pudimos leer la configuración/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Conectar y continuar" })).not.toBeInTheDocument()
  })

  /* The fixture login paths (register, Face-Auth) carry no access token, so
     GET /dvr answers 401 and they land here. Without an exit the screen is a
     dead end: reloading finds no refresh cookie either. */
  it("offers a way out that clears the session first", async () => {
    mockFetchSequence([
      { status: 401, body: { statusCode: 401, code: "UNAUTHORIZED", message: "no token" } },
      { status: 204 },
    ])
    useSessionStore.getState().login("luciana@example.com")

    renderWithProviders(<AppRoutes />, { route: "/" })

    const exit = await screen.findByRole("button", { name: "Volver a iniciar sesión" })
    await userEvent.setup().click(exit)

    expect(await screen.findByRole("button", { name: "Ingresar" })).toBeInTheDocument()
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
  })
})
