import { describe, expect, it } from "vitest"
import * as camerasApi from "@/api/cameras"
import { API_BASE_URL } from "@/lib/http"
import { mockFetchSequence } from "@/test/mockFetch"
import type { MonitorZone } from "@/data/mockData"
import { bboxOf, rectPoints } from "@/lib/zones"

const stored: MonitorZone = {
  id: "11111111-1111-4111-8111-111111111111",
  points: rectPoints(10, 10, 20, 20),
  alertType: "intruso",
}

const drawn: MonitorZone = {
  id: "z-1700000000000",
  points: rectPoints(50, 50, 10, 10),
  alertType: "sospechoso",
}

describe("diffZones", () => {
  it("creates the locally drawn zones, updates the stored ones, deletes the dropped ones", () => {
    const dropped = { ...stored, id: "22222222-2222-4222-8222-222222222222" }

    const diff = camerasApi.diffZones([stored, dropped], [stored, drawn])

    expect(diff.created).toEqual([drawn])
    expect(diff.updated).toEqual([stored])
    expect(diff.deletedIds).toEqual([dropped.id])
  })
})

describe("saveZones", () => {
  it("posts, puts and deletes, and answers the stored zones with English levels translated", async () => {
    const fetchMock = mockFetchSequence([
      {
        status: 201,
        body: {
          ...drawn,
          // The wire format carries the bounding box; the domain zone does not.
          ...bboxOf(drawn.points),
          id: "33333333-3333-4333-8333-333333333333",
          cameraId: "cam",
          alertType: "suspicious",
        },
      },
      { body: { ...stored, ...bboxOf(stored.points), cameraId: "cam", alertType: "intruder" } },
      { status: 204 },
    ])

    const saved = await camerasApi.saveZones(
      "cam",
      [stored, { ...stored, id: "44444444-4444-4444-8444-444444444444" }],
      [stored, drawn],
    )

    const calls = fetchMock.mock.calls as [string, RequestInit][]
    expect(calls[0][0]).toBe(`${API_BASE_URL}/cameras/cam/zones`)
    expect(calls[0][1].method).toBe("POST")
    const posted = JSON.parse(calls[0][1].body as string)
    expect(posted.alertType).toBe("suspicious")
    // The outline rides along with its bounding box.
    expect(posted.points).toEqual(rectPoints(50, 50, 10, 10))
    expect(calls[1][0]).toBe(`${API_BASE_URL}/zones/${stored.id}`)
    expect(calls[1][1].method).toBe("PUT")
    expect(calls[2][1].method).toBe("DELETE")

    // No local `z-` id survives a save, so a second save updates instead of duplicating.
    expect(saved.map((zone) => zone.id)).toEqual([
      stored.id,
      "33333333-3333-4333-8333-333333333333",
    ])
    expect(saved.map((zone) => zone.alertType)).toEqual(["intruso", "sospechoso"])
  })
})

describe("updateCamera", () => {
  it("sends the English alert level and reads back the Spanish one", async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          id: "cam",
          externalId: "1",
          name: "Portón",
          location: null,
          status: "online",
          isConfigured: true,
          isEnabled: true,
          monitorMode: "full",
          alertType: "intruder",
          latestSnapshotUrl: "/api/v1/snapshots/abc",
        },
      },
    ])

    const camera = await camerasApi.updateCamera("cam", {
      name: "Portón",
      location: "  ",
      monitorMode: "full",
      alertType: "intruso",
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.alertType).toBe("intruder")
    // A blank location is left out rather than sent as an empty string.
    expect(body).not.toHaveProperty("location")
    expect(camera.alertType).toBe("intruso")
    expect(camera.snapshotUrl).toBe("/api/v1/snapshots/abc")
  })
})

describe("listZones", () => {
  it("reads a stored outline, and falls back to the rectangle corners without one", async () => {
    mockFetchSequence([
      {
        body: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            cameraId: "cam",
            x: 10,
            y: 10,
            width: 20,
            height: 20,
            alertType: "intruder",
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            cameraId: "cam",
            x: 10,
            y: 10,
            width: 40,
            height: 30,
            points: [
              { x: 30, y: 10 },
              { x: 10, y: 40 },
              { x: 50, y: 25 },
            ],
            alertType: "suspicious",
          },
        ],
      },
    ])

    const zones = await camerasApi.listZones("cam")

    expect(zones[0].points).toEqual(rectPoints(10, 10, 20, 20))
    expect(zones[1].points).toEqual([
      { x: 30, y: 10 },
      { x: 10, y: 40 },
      { x: 50, y: 25 },
    ])
  })
})
