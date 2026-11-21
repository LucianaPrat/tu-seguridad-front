import { beforeEach, describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import CameraLivePage from "./CameraLivePage"
import { meResponse } from "@/test/fixtures"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Routed by URL rather than a call-order queue: the list and the live query
 * fire from parent and child in the same commit. The live endpoint answers 409
 * (no media server on a dev box), so hls.js never runs — jsdom has no MSE.
 */
function camera(id: string, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    externalId: id,
    name,
    location: null,
    status: "online",
    isConfigured: true,
    isEnabled: true,
    monitorMode: "full",
    alertType: "intruder",
    lastSnapshotAt: null,
    latestSnapshotUrl: null,
    ...overrides,
  }
}

const CAMERAS = [
  camera("cam-01", "Frente"),
  camera("cam-02", "Patio"),
  camera("cam-03", "Apagada", { isEnabled: false }),
]

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function renderPage(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<p>dashboard</p>} />
      <Route path="/cameras/:id/live" element={<CameraLivePage />} />
    </Routes>,
    { route: `/cameras/${id}/live` },
  )
}

describe("CameraLivePage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token", user: meResponse() })
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/live")
          ? json(409, { statusCode: 409, code: "MEDIA_OFF", message: "off" })
          : json(200, CAMERAS),
      ),
    )
  })

  it("shows a home button and a strip of the watchable cameras, current marked", async () => {
    renderPage("cam-01")

    expect(await screen.findByRole("heading", { name: "Frente" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/")

    const strip = screen.getByRole("navigation", { name: "Otras cámaras" })
    const tiles = strip.querySelectorAll("a")
    expect(tiles).toHaveLength(2)
    expect(tiles[0]).toHaveAttribute("aria-current", "page")
    expect(tiles[1]).toHaveAttribute("href", "/cameras/cam-02/live")
  })

  it("says the camera has no signal and offers a retry", async () => {
    renderPage("cam-01")

    expect(await screen.findByText("Sin señal")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })

  it("switches camera with the arrow keys and leaves with Escape", async () => {
    const user = userEvent.setup()
    renderPage("cam-01")
    await screen.findByRole("heading", { name: "Frente" })

    await user.keyboard("{ArrowRight}")
    expect(await screen.findByRole("heading", { name: "Patio" })).toBeInTheDocument()

    await user.keyboard("{Escape}")
    expect(await screen.findByText("dashboard")).toBeInTheDocument()
  })
})
