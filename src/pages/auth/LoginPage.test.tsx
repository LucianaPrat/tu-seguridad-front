import { beforeEach, describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LoginPage from "./LoginPage"
import { useSessionStore } from "@/stores/sessionStore"
import { mockFetchNetworkError, mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"

function renderPage() {
  return renderWithProviders(<LoginPage />, { route: "/login" })
}

/** Login answers with the token, then the page loads the profile off /auth/me. */
function mockSuccessfulLogin() {
  return mockFetchSequence([
    { body: { accessToken: "atoken" } },
    { body: { id: 7, email: "admin@tu-seguridad.local", role: "admin" } },
  ])
}

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText("Email"), email)
  await userEvent.type(screen.getByLabelText("Contraseña"), password)
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))
}

beforeEach(() => {
  useSessionStore.setState({
    authStatus: "ready",
    accessToken: null,
    isLoggedIn: false,
    user: null,
  })
})

/*
 * Covers the react-hook-form + Zod wiring end to end, plus the real network
 * path: the resolver messages from src/lib/schemas.ts have to surface through
 * the FormField `error` prop, and server failures through the root banner.
 */
describe("LoginPage", () => {
  it("reports both field errors on an empty submit", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

    expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument()
    expect(screen.getByText("Ingresá tu contraseña")).toBeInTheDocument()
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
  })

  it("rejects a malformed email but accepts the password", async () => {
    renderPage()

    await fillAndSubmit("not-an-email", "hunter2")

    expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument()
    expect(screen.queryByText("Ingresá tu contraseña")).not.toBeInTheDocument()
  })

  it("marks the email input invalid for assistive tech", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

    await waitFor(() => {
      expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
    })
  })

  it("does not call the API while the form is invalid", async () => {
    const fetchMock = mockSuccessfulLogin()
    renderPage()

    await fillAndSubmit("not-an-email", "hunter2")

    await screen.findByText("Ingresá un email válido")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("stores the token and the real profile once the API accepts the login", async () => {
    const fetchMock = mockSuccessfulLogin()
    renderPage()

    await fillAndSubmit("admin@tu-seguridad.local", "hunter2")

    await waitFor(() => {
      expect(useSessionStore.getState().isLoggedIn).toBe(true)
    })
    const state = useSessionStore.getState()
    expect(state.accessToken).toBe("atoken")
    expect(state.user?.email).toBe("admin@tu-seguridad.local")
    expect(state.user?.id).toBe("7")

    const [loginUrl] = fetchMock.mock.calls[0] as [string]
    const [meUrl] = fetchMock.mock.calls[1] as [string]
    expect(loginUrl).toContain("/auth/login")
    expect(meUrl).toContain("/auth/me")
  })

  it("shows a banner and stays logged out on wrong credentials", async () => {
    mockFetchSequence([
      {
        status: 401,
        body: { statusCode: 401, code: "UNAUTHORIZED", message: "Invalid email or password" },
      },
    ])
    renderPage()

    await fillAndSubmit("admin@tu-seguridad.local", "wrong-password")

    expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña incorrectos")
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
    expect(useSessionStore.getState().accessToken).toBeNull()
  })

  it("reports an unreachable backend", async () => {
    mockFetchNetworkError()
    renderPage()

    await fillAndSubmit("admin@tu-seguridad.local", "hunter2")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos conectar con el servidor",
    )
  })

  it("drops the token when the login succeeds but the profile call fails", async () => {
    mockFetchSequence([
      { body: { accessToken: "atoken" } },
      { status: 401, body: { statusCode: 401, code: "UNAUTHORIZED", message: "Invalid token" } },
    ])
    renderPage()

    await fillAndSubmit("admin@tu-seguridad.local", "hunter2")

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(useSessionStore.getState().accessToken).toBeNull()
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
  })

  it("Face-Auth skips validation and logs straight in", async () => {
    renderPage()

    await userEvent.click(screen.getByRole("button", { name: /Face-Auth/ }))

    // Still fixture-backed: no Face-Auth endpoint exists yet.
    expect(useSessionStore.getState().isLoggedIn).toBe(true)
  })
})
