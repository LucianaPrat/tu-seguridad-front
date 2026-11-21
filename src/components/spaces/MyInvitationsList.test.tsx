import { beforeEach, describe, expect, it } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes, useLocation } from "react-router-dom"
import MyInvitationsList from "./MyInvitationsList"
import { currentSpace, meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

function Probe() {
  const l = useLocation()
  return <p data-testid="loc">{l.pathname + l.search}</p>
}

const row = {
  id: "inv-1",
  spaceId: "space-2",
  spaceName: "Casa",
  invitedByName: "Ada Lovelace",
  role: "collaborator",
  expiresAt: "2030-01-01T00:00:00.000Z",
}

function renderList() {
  return renderWithProviders(
    <Routes>
      <Route path="/invitations" element={<MyInvitationsList />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { route: "/invitations" },
  )
}

beforeEach(() => {
  useSessionStore.setState({
    authStatus: "ready",
    isLoggedIn: true,
    accessToken: "old",
    user: meResponse({ currentSpace: null, spaces: [], pendingInvitationsCount: 1 }),
  })
})

describe("MyInvitationsList", () => {
  it("accepts an invitation and enters the space", async () => {
    mockFetchSequence([
      { body: [row] },
      { body: { accessToken: "new" } },
      { body: meResponse({ currentSpace: currentSpace({ id: "space-2", name: "Casa" }) }) },
    ])
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Aceptar" }))

    await waitFor(() => expect(screen.getByTestId("loc")).toHaveTextContent(/^\/$/))
    expect(useSessionStore.getState().accessToken).toBe("new")
    expect(useSessionStore.getState().user?.currentSpace?.id).toBe("space-2")
  })

  it("declines an invitation and shows the empty list", async () => {
    const fetchMock = mockFetchSequence([
      { body: [row] },
      { status: 204 },
      { body: meResponse({ currentSpace: null, spaces: [], pendingInvitationsCount: 0 }) },
      { body: [] },
    ])
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Rechazar" }))

    expect(await screen.findByText("No tenés invitaciones pendientes.")).toBeInTheDocument()
    expect(useSessionStore.getState().user?.pendingInvitationsCount).toBe(0)
    expect(String((fetchMock.mock.calls[1] as [string])[0])).toMatch(
      /\/invitations\/inv-1\/decline$/,
    )
  })
})
