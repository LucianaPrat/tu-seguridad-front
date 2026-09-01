import { request } from "@/lib/http"
import { ALERT_FROM_API, ALERT_TO_API } from "@/api/cameras"
import { CHANNEL_FROM_API } from "@/api/channels"
import { alertEventPageResponseSchema, alertEventResponseSchema } from "@/lib/schemas"
import type { AlertEventResponse } from "@/lib/schemas"
import type { AlertType, ChannelType } from "@/data/mockData"

export interface SecurityEvent {
  id: string
  /** Null once the camera that raised the alert is deleted. `cameraName` survives it. */
  cameraId: string | null
  cameraName: string
  alertType: AlertType
  /** Empty while no delivery was planned for the alert yet. */
  channels: ChannelType[]
  timestamp: string
  acknowledgedAt: string | null
  /** The page resolves the name from the roster; the event carries only the id. */
  acknowledgedByUserId: number | null
  /** Authenticated path of the frame that raised it. Behind the bearer, so `requestBlob` fetches it. */
  snapshotUrl: string | null
  /** Both null on an alert recorded before the pipeline stored its detections. */
  personsDetected: number | null
  confidence: number | null
}

export interface SecurityEventPage {
  items: SecurityEvent[]
  nextCursor: string | null
}

export interface ListEventsParams {
  alertType?: AlertType
  /** Inclusive lower bound on the detection time. `YYYY-MM-DD`, straight from the date input. */
  from?: string
  cursor?: string
}

function toEvent(dto: AlertEventResponse): SecurityEvent {
  return {
    id: dto.id,
    cameraId: dto.cameraId,
    cameraName: dto.cameraLabel,
    alertType: ALERT_FROM_API[dto.alertType],
    channels: dto.channels.map((channel) => CHANNEL_FROM_API[channel]),
    timestamp: dto.detectedAt,
    acknowledgedAt: dto.acknowledgedAt,
    acknowledgedByUserId: dto.acknowledgedByUserId,
    snapshotUrl: dto.snapshotUrl,
    personsDetected: dto.personsDetected,
    confidence: dto.confidence,
  }
}

/** One alert, by id. Same DTO as a list row — the detail screen just shows more of it. */
export async function getEvent(id: string): Promise<SecurityEvent> {
  return toEvent(alertEventResponseSchema.parse(await request<unknown>(`/events/${id}`)))
}

export async function listEvents(params: ListEventsParams = {}): Promise<SecurityEventPage> {
  const query = new URLSearchParams()
  if (params.alertType) query.set("alertType", ALERT_TO_API[params.alertType])
  // The date input yields `YYYY-MM-DD`; the route validates ISO 8601. Parsed as
  // local midnight on purpose — the operator picked a day in their own clock.
  if (params.from) query.set("from", new Date(`${params.from}T00:00:00`).toISOString())
  if (params.cursor) query.set("cursor", params.cursor)

  const search = query.toString()
  const dto = alertEventPageResponseSchema.parse(
    await request<unknown>(`/events${search ? `?${search}` : ""}`),
  )
  return { items: dto.items.map(toEvent), nextCursor: dto.nextCursor }
}

/*
 * POST /events/acknowledgements with the token from an alert email.
 *
 * `auth: false` is the whole point: the token is the credential, and the person
 * who just opened the mail on a phone is usually not logged in. The route
 * answers 202 for a match, a repeat and a token that fails its signature alike,
 * so a resolved promise means the call was accepted — never that this token was
 * the one that acknowledged the alert.
 */
export async function acknowledgeAlert(token: string): Promise<void> {
  await request<{ accepted: boolean }>("/events/acknowledgements", {
    method: "POST",
    body: { token },
    auth: false,
  })
}
