import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App, { AppRoutes } from "./App"
import { queryClient } from "@/lib/queryClient"
import { useLocaleStore } from "@/stores/localeStore"
import { useSessionStore } from "@/stores/sessionStore"
import { currentSpace, meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"

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
    mockFetchSequence([])
    useSessionStore.setState({
      isLoggedIn: true,
      accessToken: "atoken",
      user: meResponse({ currentSpace: currentSpace({ hasDvr: false }) }),
    })

    render(<App />)

    expect(await screen.findByRole("button", { name: "Conectar y continuar" })).toBeInTheDocument()
  })

  it("lets an authenticated user with a stored DVR reach the dashboard", async () => {
    mockFetchSequence([{ body: [] }])
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
    mockFetchSequence([{ body: [] }])
    useSessionStore.getState().login("luciana@example.com")
    window.history.pushState({}, "", "/onboarding/dvr")

    render(<App />)

    expect(await screen.findByText("Panel de cámaras")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Conectar y continuar" })).not.toBeInTheDocument()
  })

  it("parks an incomplete profile on the profile form and never reads the DVR", async () => {
    const fetchMock = mockFetchSequence([])
    useSessionStore.setState({
      isLoggedIn: true,
      accessToken: "atoken",
      user: meResponse({ firstName: "", lastName: "", phone: "", profileCompleted: false }),
    })

    render(<App />)

    // Every protected route answers 403 for such a session, GET /dvr included,
    // so asking would only flash the "no pudimos leer el DVR" dead end.
    expect(await screen.findByRole("button", { name: "Guardar y entrar" })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
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
      { body: meResponse({ currentSpace: currentSpace({ hasDvr: false }) }) },
    ])

    render(<App />)

    // No DVR yet, so a restored session lands on onboarding — and never
    // flashes the login screen on the way.
    expect(await screen.findByRole("button", { name: "Conectar y continuar" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ingresar" })).not.toBeInTheDocument()
    expect(useSessionStore.getState().accessToken).toBe("atoken")
  })

  it("applies the account language from /auth/me", async () => {
    mockFetchSequence([
      { body: { accessToken: "atoken" } },
      { body: meResponse({ locale: "en", currentSpace: currentSpace({ hasDvr: false }) }) },
    ])

    render(<App />)

    expect(await screen.findByRole("button", { name: "Connect and continue" })).toBeInTheDocument()
    expect(useLocaleStore.getState().locale).toBe("en")
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
 * retries off, and the session is set directly so each case picks its own space.
 */
describe("space and section gates", () => {
  const signIn = (user: ReturnType<typeof meResponse>) =>
    useSessionStore.setState({ isLoggedIn: true, accessToken: "atoken", user })

  it("sends an account with no space to the create-space screen", async () => {
    mockFetchSequence([])
    signIn(meResponse({ spaces: [], currentSpace: null }))

    renderWithProviders(<AppRoutes />, { route: "/" })

    expect(await screen.findByText("Creá tu espacio")).toBeInTheDocument()
  })

  it("creates the first space and lands on the dashboard", async () => {
    const fetchMock = mockFetchSequence([
      { body: { accessToken: "new" } },
      { body: meResponse() },
      { body: [] },
    ])
    signIn(meResponse({ spaces: [], currentSpace: null }))

    renderWithProviders(<AppRoutes />, { route: "/" })

    const user = userEvent.setup()
    await user.type(await screen.findByLabelText("Nombre del espacio"), "Depósito")
    await user.click(screen.getByRole("button", { name: "Crear espacio" }))

    expect(await screen.findByText("Panel de cámaras")).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url.endsWith("/spaces")).toBe(true)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual({ name: "Depósito" })
    expect(useSessionStore.getState().accessToken).toBe("new")
  })

  it("tells a non-admin the space is not configured instead of offering the wizard", async () => {
    mockFetchSequence([])
    signIn(meResponse({ currentSpace: currentSpace({ role: "collaborator", hasDvr: false }) }))

    renderWithProviders(<AppRoutes />, { route: "/" })

    expect(await screen.findByText("Este espacio todavía no está configurado")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Conectar y continuar" })).not.toBeInTheDocument()
  })

  it("bounces a user with a space off the create-space screen", async () => {
    mockFetchSequence([{ body: [] }])
    signIn(meResponse())

    renderWithProviders(<AppRoutes />, { route: "/spaces/start" })

    expect(await screen.findByText("Panel de cámaras")).toBeInTheDocument()
  })

  it("redirects a section the member cannot see to the first one they can", async () => {
    mockFetchSequence([{ body: [] }])
    signIn(
      meResponse({
        currentSpace: currentSpace({ role: "guest", menuAccess: ["home", "monitor"] }),
      }),
    )

    renderWithProviders(<AppRoutes />, { route: "/events" })

    expect(await screen.findByText("Panel de cámaras")).toBeInTheDocument()
  })

  it("falls back to the first granted section when home is not granted", async () => {
    mockFetchSequence([{ body: [] }])
    signIn(
      meResponse({ currentSpace: currentSpace({ role: "collaborator", menuAccess: ["monitor"] }) }),
    )

    renderWithProviders(<AppRoutes />, { route: "/" })

    expect(await screen.findByText("Comportamiento de monitoreo")).toBeInTheDocument()
  })
})
