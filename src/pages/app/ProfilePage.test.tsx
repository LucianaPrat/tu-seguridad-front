import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import ProfilePage from "./ProfilePage"
import { meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

function bodyOf(fetchMock: ReturnType<typeof mockFetchSequence>, call: number) {
  const [url, init] = fetchMock.mock.calls[call] as [string, RequestInit]
  return { url, init, body: JSON.parse(init.body as string) }
}

describe("ProfilePage", () => {
  beforeEach(() => {
    useSessionStore.setState({
      authStatus: "ready",
      accessToken: "atoken",
      isLoggedIn: true,
      user: meResponse(),
    })
  })
  afterEach(() => vi.useRealTimers())

  it("autosaves only the changed field after the debounce", async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetchSequence([{ body: meResponse({ firstName: "Ada" }) }])
    renderWithProviders(<ProfilePage />)

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ada" } })
    await act(() => vi.advanceTimersByTimeAsync(700))
    expect(fetchMock).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(200))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, init, body } = bodyOf(fetchMock, 0)
    expect(url).toContain("/auth/me")
    expect(init.method).toBe("PATCH")
    expect(body).toEqual({ firstName: "Ada" })
    expect(useSessionStore.getState().user?.firstName).toBe("Ada")
    expect(screen.getByText("Guardado")).toBeInTheDocument()
  })

  it("does not send an invalid phone", async () => {
    vi.useFakeTimers()
    const fetchMock = mockFetchSequence([])
    renderWithProviders(<ProfilePage />)

    fireEvent.change(screen.getByLabelText("Teléfono móvil"), { target: { value: "1234" } })
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Teléfono móvil")).toHaveAttribute("aria-invalid", "true")
  })

  it("saves the language at once through PATCH", async () => {
    const fetchMock = mockFetchSequence([{ body: meResponse({ locale: "en" }) }])
    renderWithProviders(<ProfilePage />)

    fireEvent.change(screen.getByLabelText("Idioma / Language"), { target: { value: "en" } })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(bodyOf(fetchMock, 0).body).toEqual({ locale: "en" })
  })

  it("switches section through ?tab", () => {
    renderWithProviders(<ProfilePage />, { route: "/profile?tab=security" })
    expect(screen.getByRole("tab", { name: "Seguridad" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByLabelText("Contraseña actual")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Datos personales" }))
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument()
  })

  it("changes the password and stores the new token", async () => {
    const fetchMock = mockFetchSequence([{ body: { accessToken: "rotated" } }])
    renderWithProviders(<ProfilePage />, { route: "/profile?tab=security" })

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "vieja12345" },
    })
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "nuevaClave123" },
    })
    fireEvent.change(screen.getByLabelText("Repetir nueva contraseña"), {
      target: { value: "nuevaClave123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }))

    await waitFor(() => expect(useSessionStore.getState().accessToken).toBe("rotated"))
    const { url, body } = bodyOf(fetchMock, 0)
    expect(url).toContain("/auth/password")
    expect(body).toEqual({ currentPassword: "vieja12345", newPassword: "nuevaClave123" })
    expect(await screen.findByText("Contraseña actualizada")).toBeInTheDocument()
  })

  it("maps a 400 to the current-password field", async () => {
    mockFetchSequence([{ status: 400, body: { code: "VALIDATION_ERROR", message: "bad" } }])
    renderWithProviders(<ProfilePage />, { route: "/profile?tab=security" })

    fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "mala" } })
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), {
      target: { value: "nuevaClave123" },
    })
    fireEvent.change(screen.getByLabelText("Repetir nueva contraseña"), {
      target: { value: "nuevaClave123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }))

    expect(await screen.findByText(/contraseña actual es incorrecta/i)).toBeInTheDocument()
  })
})
