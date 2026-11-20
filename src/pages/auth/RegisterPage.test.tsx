import { beforeEach, describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RegisterPage from "./RegisterPage"
import { useSessionStore } from "@/stores/sessionStore"
import { meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText("Nombre"), "Ada")
  await userEvent.type(screen.getByLabelText("Apellido"), "Lovelace")
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com")
  await userEvent.type(screen.getByLabelText("Teléfono móvil"), "+5491122334455")
  await userEvent.type(screen.getByLabelText("Contraseña"), "a-long-password")
  await userEvent.type(screen.getByLabelText("Repetir contraseña"), "a-long-password")
  await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))
}

beforeEach(() => {
  useSessionStore.setState({
    authStatus: "ready",
    accessToken: null,
    isLoggedIn: false,
    user: null,
  })
})

describe("RegisterPage", () => {
  it("posts the account with a derived space name, then loads the profile", async () => {
    const fetchMock = mockFetchSequence([
      { status: 201, body: { accessToken: "atoken" } },
      { body: meResponse({ id: 9 }) },
    ])
    renderWithProviders(<RegisterPage />, { route: "/register" })

    await fillAndSubmit()

    await waitFor(() => expect(useSessionStore.getState().isLoggedIn).toBe(true))
    expect(useSessionStore.getState().accessToken).toBe("atoken")
    const [registerUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(registerUrl).toContain("/auth/register")
    expect(JSON.parse(init.body as string)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+5491122334455",
      password: "a-long-password",
      spaceName: "Espacio de Ada",
      locale: "es",
    })
    expect((fetchMock.mock.calls[1] as [string])[0]).toContain("/auth/me")
  })

  it("reports an email that is already registered", async () => {
    mockFetchSequence([
      {
        status: 409,
        body: { statusCode: 409, code: "CONFLICT", message: "Email is already registered" },
      },
    ])
    renderWithProviders(<RegisterPage />, { route: "/register" })

    await fillAndSubmit()

    expect(await screen.findByRole("alert")).toHaveTextContent("Ese email ya está registrado")
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
  })
})
