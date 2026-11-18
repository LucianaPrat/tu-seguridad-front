import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import MembersPage from "./MembersPage"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Two queries leave the same render, so an ordered fetch queue would be a race.
 * This stub answers by URL instead, which is also what the "a member never asks
 * for the invitations" assertion reads.
 */
function mockRoutes(routes: Record<string, { status?: number; body?: unknown }>) {
  const fetchMock = vi.fn((url: string) => {
    const match = Object.keys(routes).find((path) => url.includes(path))
    if (!match) return Promise.reject(new Error(`unexpected fetch: ${url}`))
    const { status = 200, body } = routes[match]
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: "luciana@ejemplo.com",
    firstName: "Luciana",
    lastName: "García",
    phone: "+5491112345678",
    avatarUrl: null,
    isActive: true,
    profileCompleted: true,
    lastLoginAt: "2026-07-28T22:00:00.000Z",
    receiveAlerts: true,
    ...overrides,
  }
}

const INVITED = member({
  id: 2,
  email: "nueva@ejemplo.com",
  firstName: "",
  lastName: "",
  phone: "",
  profileCompleted: false,
  lastLoginAt: null,
})

const PENDING = {
  id: "inv-1",
  email: "pendiente@ejemplo.com",
  expiresAt: "2026-08-29T12:00:00.000Z",
  createdAt: "2026-08-22T12:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("MembersPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })

  it("renders the roster and the pending invitations for an admin", async () => {
    mockRoutes({
      "/members": { body: { items: [member(), INVITED], total: 2 } },
      "/invitations": { body: { items: [PENDING], total: 1 } },
    })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByText("Luciana García")).toBeInTheDocument()
    expect(screen.getByText("2 usuarios registrados")).toBeInTheDocument()
    // An unfinished profile has no name and never logged in; the email column is
    // what identifies it.
    expect(screen.getByText("nueva@ejemplo.com")).toBeInTheDocument()
    expect(screen.getByText("Sin nombre")).toBeInTheDocument()
    expect(screen.getByText("Perfil incompleto")).toBeInTheDocument()
    expect(screen.getByText("Nunca")).toBeInTheDocument()
    expect(await screen.findByText("pendiente@ejemplo.com")).toBeInTheDocument()
    expect(screen.getByText("Pendiente")).toBeInTheDocument()
  })

  it("never asks for the invitations as a plain member", async () => {
    const fetchMock = mockRoutes({ "/members": { body: { items: [member()], total: 1 } } })
    useSessionStore.setState({ user: meResponse({ role: "member" }) })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByText("Luciana García")).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes("/invitations"))).toBe(true)
  })

  it("offers no invite button to a plain member", async () => {
    mockRoutes({ "/members": { body: { items: [member()], total: 1 } } })
    useSessionStore.setState({ user: meResponse({ role: "member" }) })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByText("Luciana García")).toBeInTheDocument()
    // POST /invitations is admin-only: a button that can only 403 is worse than none.
    expect(screen.queryByRole("button", { name: /Invitar miembro/ })).not.toBeInTheDocument()
  })

  it("shows the backend message when the roster fails", async () => {
    mockRoutes({
      "/members": {
        status: 500,
        body: { statusCode: 500, code: "INTERNAL_ERROR", message: "boom" },
      },
      "/invitations": { body: { items: [], total: 0 } },
    })

    renderWithProviders(<MembersPage />)

    expect(await screen.findByRole("alert")).toHaveTextContent("boom")
  })
})
