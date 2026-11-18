import { beforeEach, describe, expect, it } from "vitest"
import userEvent from "@testing-library/user-event"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import DashboardPage from "./DashboardPage"
import { mockFetchSequence } from "@/test/mockFetch"
import { renderWithProviders } from "@/test/renderWithProviders"
import { useSessionStore } from "@/stores/sessionStore"

/*
 * Stubbed at the HTTP boundary: the page's whole job is turning `GET /cameras`
 * into three buckets and `Desactivar` into a `PUT`.
 *
 * `latestSnapshotUrl` is null on every fixture on purpose — a snapshot path
 * would send `useSnapshotImage` after bytes the fetch queue does not hold.
 * hls.js is never exercised either: jsdom has no MSE, and `LiveThumbnail`
 * mounts only on hover, which no case here does.
 */
function camera(overrides: Record<string, unknown>) {
  return {
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
    ...overrides,
  }
}

const ONLINE = camera({})
const OFF = camera({ id: "cam-02", externalId: "2", name: "Cámara 02", isEnabled: false })
const RAW = camera({
  id: "cam-03",
  externalId: "3",
  name: "Cámara 03",
  isConfigured: false,
  location: null,
})
const RAW_OFF = camera({
  id: "cam-04",
  externalId: "4",
  name: "Cámara 04",
  isConfigured: false,
  isEnabled: false,
  location: null,
})

describe("DashboardPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ isLoggedIn: true, accessToken: "token" })
  })

  it("splits the API's cameras into configured, disabled and unconfigured", async () => {
    mockFetchSequence([{ body: [ONLINE, OFF, RAW, RAW_OFF] }])
    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText("Cámara 01")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Cámaras configuradas" })).toBeInTheDocument()
    // An unconfigured camera that was switched off sits with the disabled ones,
    // not in the unconfigured section.
    expect(screen.getByRole("button", { name: "Cámaras desactivadas (2)" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Cámaras sin configurar" })).toBeInTheDocument()
    expect(screen.getByText("Cámara 02")).toBeInTheDocument()
    expect(screen.getByText("Cámara 03")).toBeInTheDocument()
    expect(screen.getByText("Cámara 04")).toBeInTheDocument()
    // Unconfigured cards carry the action menu too, so they can be disabled.
    expect(screen.getByRole("button", { name: "Acciones de Cámara 03" })).toBeInTheDocument()
  })

  it("PUTs isEnabled false when an operator disables a camera", async () => {
    const fetchMock = mockFetchSequence([
      { body: [ONLINE] },
      { body: { ...ONLINE, isEnabled: false } },
      { body: [{ ...ONLINE, isEnabled: false }] },
    ])
    renderWithProviders(<DashboardPage />)

    const user = userEvent.setup()
    await user.click(await screen.findByRole("button", { name: "Acciones de Cámara 01" }))
    await user.click(screen.getByRole("button", { name: "Desactivar" }))

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1))
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toContain("/cameras/cam-01")
    expect(init.method).toBe("PUT")
    expect(JSON.parse(init.body)).toEqual({ isEnabled: false })
  })

  it("shows Conectando while the live request is in flight, then Sin señal once it fails", async () => {
    mockFetchSequence([{ body: [ONLINE] }, { status: 409 }])
    renderWithProviders(<DashboardPage />)

    const card = (await screen.findByText("Cámara 01")).closest(".group")
    expect(card).not.toBeNull()

    // The card waits 300 ms before it asks for the stream; real timers cover it,
    // `findByText` polls for a full second.
    fireEvent.mouseEnter(card!)

    expect(await screen.findByText("Conectando")).toBeInTheDocument()
    expect(await screen.findByText("Sin señal")).toBeInTheDocument()
  })

  it("POSTs a fresh snapshot when a hover that played live ends", async () => {
    const fetchMock = mockFetchSequence([
      { body: [ONLINE] },
      { body: { protocol: "hls", url: "http://127.0.0.1:8888/x/index.m3u8" } },
      {
        body: {
          id: "s1",
          cameraId: ONLINE.id,
          url: "/snapshots/s1",
          capturedAt: "2026-08-22T00:00:00.000Z",
        },
      },
    ])
    const { container } = renderWithProviders(<DashboardPage />)

    const card = (await screen.findByText("Cámara 01")).closest(".group")
    expect(card).not.toBeNull()

    fireEvent.mouseEnter(card!)

    await waitFor(() => expect(container.querySelector("video")).not.toBeNull())
    fireEvent.playing(container.querySelector("video")!)

    fireEvent.mouseLeave(card!)

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => c[0].endsWith("/cameras/cam-01/snapshots"))
      expect(call).toBeDefined()
      expect(call![1].method).toBe("POST")
    })
  })
})
