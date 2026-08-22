import { beforeEach, describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import InvitationAcceptPage from "./InvitationAcceptPage"
import CompleteProfilePage from "@/pages/onboarding/CompleteProfilePage"
import { meResponse } from "@/test/fixtures"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/* Mounted with the destination route so the redirect can be asserted. */
function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/invitations/accept" element={<InvitationAcceptPage />} />
      <Route path="/onboarding/profile" element={<CompleteProfilePage />} />
    </Routes>,
    { route },
  )
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

  it("trades the token for a session and lands on the profile form", async () => {
    const fetchMock = mockFetchSequence([
      { body: { accessToken: "atoken" } },
      { body: meResponse({ firstName: "", lastName: "", phone: "", profileCompleted: false }) },
    ])

    renderAt("/invitations/accept?token=raw-token")

    expect(await screen.findByRole("button", { name: "Guardar y entrar" })).toBeInTheDocument()
    expect(useSessionStore.getState().accessToken).toBe("atoken")

    const [acceptUrl, acceptInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(acceptUrl).toContain("/invitations/accept")
    expect(JSON.parse(acceptInit.body as string)).toEqual({ token: "raw-token" })
    // Single-use token: StrictMode or not, it is spent exactly once.
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes("/invitations/accept")),
    ).toHaveLength(1)
  })

  it("says the link is spent on a 401", async () => {
    mockFetchSequence([
      { status: 401, body: { statusCode: 401, code: "UNAUTHORIZED", message: "gone" } },
    ])

    renderAt("/invitations/accept?token=used")

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya se usó o venció/)
    expect(useSessionStore.getState().isLoggedIn).toBe(false)
  })

  it("asks for nothing when the link carries no token", () => {
    const fetchMock = mockFetchSequence([])

    renderAt("/invitations/accept")

    expect(screen.getByText("Enlace inválido")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
