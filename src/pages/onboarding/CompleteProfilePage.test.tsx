import { beforeEach, describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CompleteProfilePage from "./CompleteProfilePage"
import { meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

const INCOMPLETE = meResponse({
  firstName: "",
  lastName: "",
  phone: "",
  profileCompleted: false,
})

async function fill(values: { phone: string; password: string }) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Nombre"), "Ada")
  await user.type(screen.getByLabelText("Apellido"), "Lovelace")
  await user.type(screen.getByLabelText("Teléfono móvil"), values.phone)
  await user.type(screen.getByLabelText("Contraseña"), values.password)
  await user.type(screen.getByLabelText("Repetir contraseña"), values.password)
  await user.click(screen.getByRole("button", { name: "Guardar y entrar" }))
}

describe("CompleteProfilePage", () => {
  beforeEach(() => {
    useSessionStore.setState({
      authStatus: "ready",
      accessToken: "atoken",
      isLoggedIn: true,
      user: INCOMPLETE,
    })
  })

  it("posts the profile and re-issues the session", async () => {
    const fetchMock = mockFetchSequence([
      { body: { accessToken: "reissued" } },
      { body: meResponse() },
    ])

    renderWithProviders(<CompleteProfilePage />)
    await fill({ phone: "+5491112345678", password: "claveLarga123" })

    await waitFor(() => expect(useSessionStore.getState().accessToken).toBe("reissued"))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/auth/complete-profile")
    // The repeated password is a form-only field.
    expect(JSON.parse(init.body as string)).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+5491112345678",
      password: "claveLarga123",
    })
    expect(useSessionStore.getState().user?.profileCompleted).toBe(true)
  })

  it("blocks a local phone and a short password before any request", async () => {
    const fetchMock = mockFetchSequence([])

    renderWithProviders(<CompleteProfilePage />)
    await fill({ phone: "1112345678", password: "corta123" })

    expect(await screen.findByText(/formato internacional/i)).toBeInTheDocument()
    expect(screen.getByText("Mínimo 12 caracteres")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
