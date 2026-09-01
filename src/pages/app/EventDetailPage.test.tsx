import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import EventDetailPage from "./EventDetailPage"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/* Same shape as EventsPage's stub: the page fires /events/:id and /members from
 * one render, so an ordered queue would be a race. */
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
    channels: ["email"],
    detectedAt: "2025-07-28T22:14:00.000Z",
    // Null on purpose: a path would send the page through requestBlob, which
    // needs a blob response rather than the JSON stub above.
    snapshotUrl: null,
    personsDetected: 2,
    confidence: 0.913,
    acknowledgedAt: null,
    acknowledgedByUserId: null,
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

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/events/:id" element={<EventDetailPage />} />
    </Routes>,
    { route: "/events/ev-01" },
  )
}

beforeEach(() => {
  useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  useSessionStore.setState({ isLoggedIn: false, accessToken: null, user: null })
})

describe("EventDetailPage", () => {
  it("reads the alert by the id in the path and shows its detections", async () => {
    const fetchMock = mockRoutes({ "/events/ev-01": event(), "/members": ROSTER })

    renderPage()

    expect(await screen.findByText("Cámara 01 – Frente de casa")).toBeInTheDocument()
    expect(screen.getByText("Intruso")).toBeInTheDocument()
    expect(screen.getByText("Email")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("91%")).toBeInTheDocument()
    expect(screen.getByText("No reconocido")).toBeInTheDocument()
    expect(screen.getByText("Esta alerta no guardó una captura")).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/events/ev-01"))).toBe(true)
  })

  it("names the member who acknowledged it", async () => {
    mockRoutes({
      "/events/ev-01": event({
        acknowledgedAt: "2025-07-28T22:16:42.000Z",
        acknowledgedByUserId: 7,
      }),
      "/members": ROSTER,
    })

    renderPage()

    expect(await screen.findByText("Reconocido por Luciana García")).toBeInTheDocument()
  })
})
