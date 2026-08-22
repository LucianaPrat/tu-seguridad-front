import { request } from "@/lib/http"
import {
  cameraResponseSchema,
  liveStreamResponseSchema,
  monitorZoneResponseSchema,
  snapshotResponseSchema,
} from "@/lib/schemas"
import type { CameraResponse, LiveStreamResponse, MonitorZoneResponse } from "@/lib/schemas"
import type { AlertType, MonitorMode, MonitorZone } from "@/data/mockData"
import { bboxOf, rectPoints } from "@/lib/zones"

/*
 * Cameras, their monitor behaviour and their zones. The API names alert levels
 * in English and the UI in Spanish, so the translation happens here and the
 * pages keep using `AlertType`.
 */

type ApiAlertType = "intruder" | "suspicious"

const TO_API: Record<AlertType, ApiAlertType> = {
  intruso: "intruder",
  sospechoso: "suspicious",
}

const FROM_API: Record<ApiAlertType, AlertType> = {
  intruder: "intruso",
  suspicious: "sospechoso",
}

export interface Camera {
  id: string
  /** DVR channel id. Stands in as a label when the recorder gave no location. */
  externalId: string
  name: string
  location: string | null
  status: "online" | "offline"
  isConfigured: boolean
  isEnabled: boolean
  monitorMode: MonitorMode
  alertType: AlertType | null
  lastSnapshotAt: string | null
  /** Authenticated path of the latest stored frame — read it with `requestBlob`. */
  snapshotUrl: string | null
}

export interface CameraSettings {
  name: string
  /** Discovery never fills this, so it is the operator's to write. */
  location: string
  monitorMode: MonitorMode
  /** Sent on both modes: full-frame needs it, partial keeps it as the default. */
  alertType: AlertType
}

function toCamera(dto: CameraResponse): Camera {
  return {
    id: dto.id,
    externalId: dto.externalId,
    name: dto.name,
    location: dto.location ?? null,
    status: dto.status,
    isConfigured: dto.isConfigured,
    isEnabled: dto.isEnabled,
    monitorMode: dto.monitorMode,
    alertType: dto.alertType ? FROM_API[dto.alertType] : null,
    lastSnapshotAt: dto.lastSnapshotAt ?? null,
    snapshotUrl: dto.latestSnapshotUrl ?? null,
  }
}

function toZone(dto: MonitorZoneResponse): MonitorZone {
  return {
    id: dto.id,
    // A zone stored before outlines existed answers none, and then the
    // rectangle is the shape. Fewer than three points is not a polygon either,
    // and `bboxOf` of an empty array is Infinity, so length decides, not null.
    points:
      dto.points && dto.points.length >= 3
        ? dto.points
        : rectPoints(dto.x, dto.y, dto.width, dto.height),
    alertType: FROM_API[dto.alertType],
  }
}

/**
 * The outline is the shape; the box travels with it because the API validates
 * and stores it, and derives it from the outline anyway.
 */
function zoneBody(zone: MonitorZone) {
  return {
    ...bboxOf(zone.points),
    points: zone.points,
    alertType: TO_API[zone.alertType],
  }
}

export async function listCameras(): Promise<Camera[]> {
  const data = cameraResponseSchema.array().parse(await request<unknown>("/cameras"))
  return data.map(toCamera)
}

/** Admin only. Full-frame monitoring without an `alertType` is a 400. */
export async function updateCamera(id: string, settings: CameraSettings): Promise<Camera> {
  const { location, ...rest } = settings
  const data = await request<unknown>(`/cameras/${id}`, {
    method: "PUT",
    // An empty location is "unset", and the backend validates a string it gets.
    body: {
      ...rest,
      alertType: TO_API[settings.alertType],
      ...(location.trim() === "" ? {} : { location: location.trim() }),
    },
  })
  return toCamera(cameraResponseSchema.parse(data))
}

/**
 * Admin only. Every `UpdateCameraDto` field is optional, so an `isEnabled`-only
 * body is legal — and it is the whole point: this is what makes the dashboard's
 * Desactivar survive a reload instead of dying with the component state.
 */
export async function setCameraEnabled(id: string, isEnabled: boolean): Promise<Camera> {
  const data = await request<unknown>(`/cameras/${id}`, { method: "PUT", body: { isEnabled } })
  return toCamera(cameraResponseSchema.parse(data))
}

/**
 * Where to play the camera right now. Registering it makes the media server
 * pull RTSP from the recorder, so this is a request with a cost — do not fire
 * it for a pointer merely crossing a card.
 */
export async function getCameraLive(id: string): Promise<LiveStreamResponse> {
  return liveStreamResponseSchema.parse(await request<unknown>(`/cameras/${id}/live`))
}

export async function listZones(cameraId: string): Promise<MonitorZone[]> {
  const data = monitorZoneResponseSchema
    .array()
    .parse(await request<unknown>(`/cameras/${cameraId}/zones`))
  return data.map(toZone)
}

/**
 * Zones the editor drew locally carry a `z-<timestamp>` id; the stored ones
 * carry a uuid. That is the whole difference between a create and an update.
 */
export function diffZones(original: MonitorZone[], current: MonitorZone[]) {
  const storedIds = new Set(original.map((zone) => zone.id))
  const keptIds = new Set(current.map((zone) => zone.id))

  return {
    created: current.filter((zone) => !storedIds.has(zone.id)),
    updated: current.filter((zone) => storedIds.has(zone.id)),
    deletedIds: original.filter((zone) => !keptIds.has(zone.id)).map((zone) => zone.id),
  }
}

/**
 * There is no bulk zone route, so the diff turns into one call per zone.
 * Answers the stored zones, ids included, so the editor can drop its local
 * ones and a second save does not create duplicates.
 *
 * ponytail: every kept zone is PUT whether it moved or not — a handful of
 * rectangles per camera. Compare before sending if a camera ever holds dozens.
 */
export async function saveZones(
  cameraId: string,
  original: MonitorZone[],
  current: MonitorZone[],
): Promise<MonitorZone[]> {
  const { created, updated, deletedIds } = diffZones(original, current)

  const [createdZones, updatedZones] = await Promise.all([
    Promise.all(
      created.map(async (zone) =>
        toZone(
          monitorZoneResponseSchema.parse(
            await request<unknown>(`/cameras/${cameraId}/zones`, {
              method: "POST",
              body: zoneBody(zone),
            }),
          ),
        ),
      ),
    ),
    Promise.all(
      updated.map(async (zone) =>
        toZone(
          monitorZoneResponseSchema.parse(
            await request<unknown>(`/zones/${zone.id}`, {
              method: "PUT",
              body: zoneBody(zone),
            }),
          ),
        ),
      ),
    ),
    Promise.all(deletedIds.map((id) => request<void>(`/zones/${id}`, { method: "DELETE" }))),
  ])

  return [...updatedZones, ...createdZones]
}

/** Pulls a frame from the recorder now instead of waiting for the next poll. */
export async function captureSnapshot(cameraId: string): Promise<string> {
  const data = await request<unknown>(`/cameras/${cameraId}/snapshots`, { method: "POST" })
  return snapshotResponseSchema.parse(data).url
}
