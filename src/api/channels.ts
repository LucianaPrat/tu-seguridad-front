import { request } from "@/lib/http"
import { alertRoutingListResponseSchema } from "@/lib/schemas"
import { ALERT_FROM_API, ALERT_TO_API } from "@/api/cameras"
import type { AlertRoutingResponse } from "@/lib/schemas"
import type { AlertType, ChannelType } from "@/data/mockData"

/*
 * The alert routing matrix: which channels carry which alert level. The API
 * names both axes in English and the UI in Spanish, so the translation happens
 * here — same boundary rule as cameras.ts.
 */

type ApiChannel = "call" | "whatsapp" | "email"

const CHANNEL_TO_API: Record<ChannelType, ApiChannel> = {
  llamada: "call",
  whatsapp: "whatsapp",
  email: "email",
}

const CHANNEL_FROM_API: Record<ApiChannel, ChannelType> = {
  call: "llamada",
  whatsapp: "whatsapp",
  email: "email",
}

export interface AlertRouting {
  alertType: AlertType
  channel: ChannelType
  enabled: boolean
}

function toRouting(dto: AlertRoutingResponse): AlertRouting {
  return {
    alertType: ALERT_FROM_API[dto.alertType],
    channel: CHANNEL_FROM_API[dto.channel],
    enabled: dto.enabled,
  }
}

export async function listAlertRoutings(): Promise<AlertRouting[]> {
  const dto = alertRoutingListResponseSchema.parse(await request<unknown>("/alert-routings"))
  return dto.items.map(toRouting)
}

/**
 * Partial writes are legal — only the cells sent are stored — so one toggled
 * checkbox sends one cell and the answer is still the whole matrix.
 */
export async function saveAlertRoutings(routings: AlertRouting[]): Promise<AlertRouting[]> {
  const dto = alertRoutingListResponseSchema.parse(
    await request<unknown>("/alert-routings", {
      method: "PUT",
      body: {
        items: routings.map((routing) => ({
          alertType: ALERT_TO_API[routing.alertType],
          channel: CHANNEL_TO_API[routing.channel],
          enabled: routing.enabled,
        })),
      },
    }),
  )
  return dto.items.map(toRouting)
}
