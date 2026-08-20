import { describe, expect, it } from "vitest"
import * as camerasApi from "@/api/cameras"
import { API_BASE_URL } from "@/lib/http"
import { mockFetchSequence } from "@/test/mockFetch"
import type { MonitorZone } from "@/data/mockData"

const stored: MonitorZone = {
  id: "11111111-1111-4111-8111-111111111111",
  x: 10,
  y: 10,
  width: 20,
  height: 20,
  alertType: "intruso",
}

const drawn: MonitorZone = {
  id: "z-1700000000000",
  x: 50,
  y: 50,
  width: 10,
  height: 10,
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
          id: "33333333-3333-4333-8333-333333333333",
          cameraId: "cam",
          alertType: "suspicious",
        },
      },
      { body: { ...stored, cameraId: "cam", alertType: "intruder" } },
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
    expect(JSON.parse(calls[0][1].body as string).alertType).toBe("suspicious")
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
