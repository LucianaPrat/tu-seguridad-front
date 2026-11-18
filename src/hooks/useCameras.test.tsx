import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { useSnapshotImage } from "@/hooks/useCameras"
import { createTestQueryClient } from "@/test/renderWithProviders"

/*
 * Refreshing a capture used to blank the frame: the new `capturedAt` is a new
 * query key, the query started empty, the image unmounted and the page
 * collapsed under the operator's scroll position. The frame has to survive the
 * refresh — and only its own, or a camera switch would paint the previous
 * camera under the new camera's zones.
 */
function Probe({ path, capturedAt }: { path: string; capturedAt: string }) {
  return <p data-testid="frame">{useSnapshotImage(path, capturedAt) ?? "sin imagen"}</p>
}

describe("useSnapshotImage", () => {
  beforeEach(() => {
    let issued = 0
    URL.createObjectURL = vi.fn(() => `blob:frame-${++issued}`)
    URL.revokeObjectURL = vi.fn()
  })

  /** First frame resolves, the next fetch never does — the loading state. */
  function mockOneFrameThenPending() {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("frame-1"))
      .mockReturnValueOnce(new Promise<Response>(() => {}))
    vi.stubGlobal("fetch", fetchMock)
  }

  it("holds the last frame while a fresh capture of the same camera loads", async () => {
    mockOneFrameThenPending()
    const client = createTestQueryClient()

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <Probe path="/snapshots/cam-01" capturedAt="2026-09-02T10:00:00Z" />
      </QueryClientProvider>,
    )
    expect(await screen.findByText("blob:frame-1")).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={client}>
        <Probe path="/snapshots/cam-01" capturedAt="2026-09-02T10:05:00Z" />
      </QueryClientProvider>,
    )

    expect(screen.getByTestId("frame")).toHaveTextContent("blob:frame-1")
  })

  it("drops the frame when the camera changes", async () => {
    mockOneFrameThenPending()
    const client = createTestQueryClient()

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <Probe path="/snapshots/cam-01" capturedAt="2026-09-02T10:00:00Z" />
      </QueryClientProvider>,
    )
    expect(await screen.findByText("blob:frame-1")).toBeInTheDocument()

    rerender(
      <QueryClientProvider client={client}>
        <Probe path="/snapshots/cam-02" capturedAt="2026-09-02T10:00:00Z" />
      </QueryClientProvider>,
    )

    expect(screen.getByTestId("frame")).toHaveTextContent("sin imagen")
  })
})
