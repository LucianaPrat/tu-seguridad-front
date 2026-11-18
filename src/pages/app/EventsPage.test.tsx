import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import EventsPage from "./EventsPage"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * The page fires /events and /members from the same render, so an ordered queue
 * would be a race. This stub answers by URL and records every one, which is
 * what the filter assertions read.
 */
function mockRoutes(routes: Record<string, unknown>) {
  const fetchMock = vi.fn((url: string) => {
    const match = Object.keys(routes).find((path) => url.includes(path))
    if (!match) return Promise.reject(new Error(`unexpected fetch: ${url}`))
    return Promise.resolve(
      new Response(JSON.stringify(routes[match]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-01",
    cameraId: "cam-01",
    zoneId: null,
    cameraLabel: "Cámara 01 – Frente de casa",
    alertType: "intruder",
    channels: ["call"],
    detectedAt: "2025-07-28T22:14:00.000Z",
    snapshotUrl: null,
    personsDetected: 1,
    confidence: 0.92,
    acknowledgedAt: "2025-07-28T22:16:42.000Z",
    acknowledgedByUserId: 7,
    ...overrides,
  }
}

const ROSTER = {
  items: [
    {
      id: 7,
      email: "luciana@ejemplo.com",
      firstName: "Luciana",
      lastName: "García",
      phone: "+5491112345678",
      avatarUrl: null,
      isActive: true,
      profileCompleted: true,
      lastLoginAt: null,
      receiveAlerts: true,
    },
  ],
  total: 1,
}

beforeEach(() => {
  useSessionStore.setState({
    isLoggedIn: true,
    accessToken: "token",
    user: meResponse(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSessionStore.setState({ isLoggedIn: false, accessToken: null, user: null })
})

describe("EventsPage", () => {
  it("renders a row with its channel and the acknowledging member's name", async () => {
    mockRoutes({
      "/events": { items: [event()], nextCursor: null },
      "/members": ROSTER,
    })

    renderWithProviders(<EventsPage />)

    expect(await screen.findByText("Cámara 01 – Frente de casa")).toBeInTheDocument()
    expect(screen.getByText("Llamada")).toBeInTheDocument()
    expect(screen.getByText("Reconocido por Luciana García")).toBeInTheDocument()
    // No `total` on the page DTO, so the subtitle counts loaded rows.
    expect(screen.getByText("1 eventos registrados")).toBeInTheDocument()
  })

  it("falls back to a neutral label when the acknowledging user left the space", async () => {
    mockRoutes({
      "/events": { items: [event({ acknowledgedByUserId: 99 })], nextCursor: null },
      "/members": ROSTER,
    })

    renderWithProviders(<EventsPage />)

    expect(await screen.findByText("Reconocido por un miembro")).toBeInTheDocument()
  })

  it("says so when an alert went out on no channel", async () => {
    mockRoutes({
      "/events": { items: [event({ channels: [] })], nextCursor: null },
      "/members": ROSTER,
    })

    renderWithProviders(<EventsPage />)

    expect(await screen.findByText("Sin envío")).toBeInTheDocument()
  })

  it("pushes the alert type filter to the query string, not to the loaded rows", async () => {
    const fetchMock = mockRoutes({
      "/events": { items: [event()], nextCursor: null },
      "/members": ROSTER,
    })

    renderWithProviders(<EventsPage />)
    await screen.findByText("Cámara 01 – Frente de casa")

    await userEvent.click(screen.getByRole("button", { name: "Sospechoso" }))

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([url]) => String(url))
      expect(urls.some((url) => url.includes("alertType=suspicious"))).toBe(true)
    })
  })

  it("sends the picked day as an ISO lower bound", async () => {
    const fetchMock = mockRoutes({
      "/events": { items: [event()], nextCursor: null },
      "/members": ROSTER,
    })

    renderWithProviders(<EventsPage />)
    await screen.findByText("Cámara 01 – Frente de casa")

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2025-07-26" } })

    // Asserted as an instant, not as a string: the param is local midnight in
    // UTC, so the literal text depends on the machine's timezone.
    await waitFor(() => {
      const url = fetchMock.mock.calls
        .map(([call]) => String(call))
        .find((call) => call.includes("from="))
      expect(url).toBeDefined()
      const from = new URL(url!).searchParams.get("from")!
      expect(new Date(from).getTime()).toBe(new Date("2025-07-26T00:00:00").getTime())
    })
  })

  it("offers another page only while the cursor says there is one", async () => {
    mockRoutes({
      "/events": { items: [event()], nextCursor: "abc" },
      "/members": ROSTER,
    })

    renderWithProviders(<EventsPage />)
    await screen.findByText("Cámara 01 – Frente de casa")

    expect(screen.getByRole("button", { name: "Cargar más" })).toBeInTheDocument()
  })
})
