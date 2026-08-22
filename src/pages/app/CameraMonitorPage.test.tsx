import { beforeEach, describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
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
})
