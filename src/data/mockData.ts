import type { Point } from "@/lib/zones"

export type AlertType = "intruso" | "sospechoso"
export type ChannelType = "llamada" | "whatsapp" | "email"
export type MonitorMode = "full" | "partial"

export interface MonitorZone {
  id: string
  /**
   * Free-hand outline, percent of frame. The only shape a zone has — the
   * bounding box the API stores and the label hangs on comes from `bboxOf`.
   */
  points: Point[]
  alertType: AlertType
}
