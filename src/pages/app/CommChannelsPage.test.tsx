import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CommChannelsPage from "./CommChannelsPage"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Two queries leave the same render, so an ordered fetch queue would be a race.
 * This stub answers by URL instead — the same shape MembersPage.test.tsx uses —
 * and it keeps the request `init` around so a test can read a PUT body.
 */
function mockRoutes(routes: Record<string, { status?: number; body?: unknown }>) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
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

// The API's full six-cell grid: intruso+llamada on, sospechoso+llamada off.
const ROUTINGS = [
  { alertType: "intruder", channel: "call", enabled: true },
  { alertType: "intruder", channel: "whatsapp", enabled: false },
  { alertType: "intruder", channel: "email", enabled: false },
  { alertType: "suspicious", channel: "call", enabled: false },
  { alertType: "suspicious", channel: "whatsapp", enabled: false },
  { alertType: "suspicious", channel: "email", enabled: true },
]

afterEach(() => vi.unstubAllGlobals())

describe("CommChannelsPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
  })

  it("renders the routing matrix for an admin", async () => {
    mockRoutes({
      "/alert-routings": { body: { items: ROUTINGS } },
      "/members": { body: { items: [member()], total: 1 } },
    })

    renderWithProviders(<CommChannelsPage />)

    expect(await screen.findByRole("checkbox", { name: "Intruso por Llamada" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Sospechoso por Llamada" })).not.toBeChecked()
  })

  it("PUTs the translated cell when an admin toggles an unchecked one", async () => {
    const fetchMock = mockRoutes({
      "/alert-routings": { body: { items: ROUTINGS } },
      "/members": { body: { items: [member()], total: 1 } },
    })

    renderWithProviders(<CommChannelsPage />)

    const checkbox = await screen.findByRole("checkbox", { name: "Sospechoso por Llamada" })
    await userEvent.click(checkbox)

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true)
    })
    const [, init] = fetchMock.mock.calls.find(([, i]) => i?.method === "PUT")!
    expect(init?.method).toBe("PUT")
    expect(JSON.parse(init?.body as string)).toEqual({
      items: [{ alertType: "suspicious", channel: "call", enabled: true }],
    })
  })

  it("disables every checkbox and switch for a non-admin", async () => {
    mockRoutes({
      "/alert-routings": { body: { items: ROUTINGS } },
      "/members": { body: { items: [member()], total: 1 } },
    })
    useSessionStore.setState({ user: meResponse({ role: "member" }) })

    renderWithProviders(<CommChannelsPage />)

    expect(await screen.findByRole("checkbox", { name: "Intruso por Llamada" })).toBeDisabled()
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled()
    }
    expect(screen.getByRole("switch")).toBeDisabled()
  })

  it("disables the switch and flags an incomplete profile, but not a complete one", async () => {
    const INCOMPLETE = member({
      id: 2,
      email: "nueva@ejemplo.com",
      firstName: "",
      lastName: "",
      phone: "",
      profileCompleted: false,
      lastLoginAt: null,
    })
    mockRoutes({
      "/alert-routings": { body: { items: ROUTINGS } },
      "/members": { body: { items: [member(), INCOMPLETE], total: 2 } },
    })

    renderWithProviders(<CommChannelsPage />)

    expect(await screen.findByText("Perfil incompleto")).toBeInTheDocument()
    const switches = screen.getAllByRole("switch")
    expect(switches).toHaveLength(2)
    expect(switches[0]).not.toBeDisabled()
    expect(switches[1]).toBeDisabled()
  })
})
