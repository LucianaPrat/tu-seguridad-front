import { beforeEach, describe, expect, it, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CameraMonitorPage from "./CameraMonitorPage"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Stubbed at the HTTP boundary: a stale `?camera=` id used to fall through to
 * `cameras[0]`, so saving wrote name, location, monitor mode and zones onto the
 * wrong camera. A deep link to a camera the recorder no longer reports must say
 * so instead of silently editing whatever loaded first.
 *
 * `latestSnapshotUrl` is null and only one response is queued: `selected` is
 * null here, so `useZones` stays disabled and the auto-capture effect never
 * fires. The camera list is the whole conversation.
 */
const CAMERA = {
  id: "cam-01",
  externalId: "1",
  name: "Cámara 01",
  location: "Frente de casa",
  status: "online",
  isConfigured: true,
  isEnabled: true,
  monitorMode: "full",
  alertType: "intruder",
  lastSnapshotAt: null,
  latestSnapshotUrl: null,
}

describe("CameraMonitorPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token" })
  })

  it("reports a stale ?camera= id instead of falling through to the first camera", async () => {
    mockFetchSequence([{ body: [CAMERA] }])
    renderWithProviders(<CameraMonitorPage />, { route: "/cameras/monitor?camera=cam-99" })

    expect(await screen.findByText(/ya no está disponible/)).toBeInTheDocument()
    // The list still offers the real camera, so the operator has a way out.
    expect(screen.getByText("Cámara 01")).toBeInTheDocument()
    expect(screen.queryByText("Nombre personalizado")).not.toBeInTheDocument()
  })

  /*
   * There is no save button any more, so a typed name has to reach the API on
   * its own — once, after the typing stops, not once per letter.
   */
  it("writes the name after the operator stops typing, in one request", async () => {
    const camera = { ...CAMERA, latestSnapshotUrl: "/snapshots/1", lastSnapshotAt: "2026-09-02" }
    const fetchMock = vi.fn(async (input: string | URL) => {
      const path = new URL(String(input)).pathname
      if (path.endsWith("/zones")) return jsonResponse([])
      if (path.endsWith("/snapshots/1")) return new Response("frame")
      if (path.endsWith("/cameras")) return jsonResponse([camera])
      return jsonResponse(camera)
    })
    vi.stubGlobal("fetch", fetchMock)
    URL.createObjectURL = vi.fn(() => "blob:frame")
    URL.revokeObjectURL = vi.fn()

    const user = userEvent.setup()
    renderWithProviders(<CameraMonitorPage />, { route: "/cameras/monitor" })

    const name = await screen.findByLabelText("Nombre personalizado")
    await user.type(name, " norte")

    await waitFor(() => expect(putsToCamera(fetchMock)).toHaveLength(1), { timeout: 3000 })
    expect(putsToCamera(fetchMock)[0][1]?.body).toContain("Cámara 01 norte")
  })
})

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

function putsToCamera(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    ([input, init]) =>
      init?.method === "PUT" && new URL(String(input)).pathname.endsWith("/cameras/cam-01"),
  )
}
