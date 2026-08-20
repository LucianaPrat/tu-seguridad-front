import { request } from "@/lib/http"
import {
  cameraResponseSchema,
  monitorZoneResponseSchema,
  snapshotResponseSchema,
} from "@/lib/schemas"
import type { CameraResponse, MonitorZoneResponse } from "@/lib/schemas"
import type { AlertType, MonitorMode, MonitorZone } from "@/data/mockData"

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
    x: dto.x,
    y: dto.y,
    width: dto.width,
    height: dto.height,
    alertType: FROM_API[dto.alertType],
  }
}

function zoneBody(zone: MonitorZone) {
  return {
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
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
