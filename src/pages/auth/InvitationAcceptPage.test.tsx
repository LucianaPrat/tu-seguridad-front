import { beforeEach, describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes, useLocation } from "react-router-dom"
import InvitationAcceptPage from "./InvitationAcceptPage"
import { currentSpace, meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

function Probe() {
  const l = useLocation()
  return <p data-testid="loc">{l.pathname + l.search}</p>
}

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/invitations/accept" element={<InvitationAcceptPage />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { route },
  )
}

const preview = {
  id: "inv-1",
  spaceName: "Casa",
  invitedByName: "Ada Lovelace",
  email: "ada@example.com",
  role: "collaborator",
  expiresAt: "2030-01-01T00:00:00.000Z",
  userExists: true,
}

function loginAs(email: string) {
  useSessionStore.setState({
    authStatus: "ready",
    isLoggedIn: true,
    accessToken: "old",
    user: meResponse({ email, currentSpace: null, spaces: [] }),
  })
}

describe("InvitationAcceptPage", () => {
  beforeEach(() => {
    useSessionStore.setState({
      authStatus: "ready",
      accessToken: null,
      isLoggedIn: false,
      user: null,
    })
  })

  it("sends an existing user to login with the landing as next", async () => {
    const fetchMock = mockFetchSequence([{ body: preview }])
    renderAt("/invitations/accept?token=tok")

    expect(
      await screen.findByText("Ada Lovelace te invitó a Casa como Colaborador"),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión para aceptar" }))

    expect(screen.getByTestId("loc")).toHaveTextContent(
      "/login?email=ada%40example.com&next=%2Finvitations%2Faccept%3Ftoken%3Dtok",
    )
    expect(String((fetchMock.mock.calls[0] as [string])[0])).toContain(
      "/invitations/preview?token=tok",
    )
  })

  it("sends a new user to register with the token", async () => {
    mockFetchSequence([{ body: { ...preview, userExists: false } }])
    renderAt("/invitations/accept?token=tok")

    await userEvent.click(await screen.findByRole("button", { name: "Crear cuenta para aceptar" }))

    expect(screen.getByTestId("loc")).toHaveTextContent(
      "/register?inviteToken=tok&email=ada%40example.com",
    )
  })

  it("accepts as the invitee and enters the space", async () => {
    loginAs("Ada@Example.com")
    const fetchMock = mockFetchSequence([
      { body: preview },
      { body: { accessToken: "new" } },
      {
        body: meResponse({
          email: "ada@example.com",
          currentSpace: currentSpace({ id: "space-2", name: "Casa", role: "collaborator" }),
        }),
      },
    ])
    renderAt("/invitations/accept?token=tok")

    await userEvent.click(await screen.findByRole("button", { name: "Aceptar" }))

    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent(/^\/$/))
    const state = useSessionStore.getState()
    expect(state.accessToken).toBe("new")
    expect(state.user?.currentSpace?.id).toBe("space-2")
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toMatch(/\/invitations\/inv-1\/accept$/)
    expect(init.method).toBe("POST")
    // The preview did not refetch after the cache wipe.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("asks a different account to sign out", async () => {
    loginAs("other@example.com")
    mockFetchSequence([{ body: preview }])
    renderAt("/invitations/accept?token=tok")

    expect(await screen.findByText(/Esta invitación es para ada@example.com/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Aceptar" })).not.toBeInTheDocument()
  })

  it("says the invitation is gone on a 404", async () => {
    mockFetchSequence([{ status: 404, body: { statusCode: 404, code: "NOT_FOUND", message: "x" } }])
    renderAt("/invitations/accept?token=tok")

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya no es válida/)
  })

  it("flags a link without a token and calls nothing", () => {
    const fetchMock = mockFetchSequence([])
    renderAt("/invitations/accept")

    expect(screen.getByText("Enlace inválido")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
