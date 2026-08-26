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

export interface SecurityEvent {
  id: string
  cameraId: string
  cameraName: string
  alertType: AlertType
  channel: ChannelType
  timestamp: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

export const EVENTS: SecurityEvent[] = [
  {
    id: "ev-01",
    cameraId: "cam-01",
    cameraName: "Cámara 01 – Frente de casa",
    alertType: "intruso",
    channel: "llamada",
    timestamp: "2025-07-28T22:14:00Z",
    acknowledged: true,
    acknowledgedBy: "Luciana García",
    acknowledgedAt: "2025-07-28T22:16:42Z",
  },
  {
    id: "ev-02",
    cameraId: "cam-03",
    cameraName: "Cámara 03 – Patio trasero",
    alertType: "sospechoso",
    channel: "whatsapp",
    timestamp: "2025-07-28T20:03:00Z",
    acknowledged: false,
  },
  {
    id: "ev-03",
    cameraId: "cam-02",
    cameraName: "Cámara 02 – Sala de estar",
    alertType: "intruso",
    channel: "email",
    timestamp: "2025-07-27T03:55:00Z",
    acknowledged: true,
    acknowledgedBy: "Martín López",
    acknowledgedAt: "2025-07-27T04:01:11Z",
  },
  {
    id: "ev-04",
    cameraId: "cam-01",
    cameraName: "Cámara 01 – Frente de casa",
    alertType: "sospechoso",
    channel: "whatsapp",
    timestamp: "2025-07-27T01:22:00Z",
    acknowledged: true,
    acknowledgedBy: "Luciana García",
    acknowledgedAt: "2025-07-27T01:24:05Z",
  },
  {
    id: "ev-05",
    cameraId: "cam-04",
    cameraName: "Cámara 04 – Garage",
    alertType: "intruso",
    channel: "llamada",
    timestamp: "2025-07-26T18:40:00Z",
    acknowledged: false,
  },
  {
    id: "ev-06",
    cameraId: "cam-03",
    cameraName: "Cámara 03 – Patio trasero",
    alertType: "intruso",
    channel: "llamada",
    timestamp: "2025-07-25T11:05:00Z",
    acknowledged: true,
    acknowledgedBy: "Ana Martínez",
    acknowledgedAt: "2025-07-25T11:08:33Z",
  },
  {
    id: "ev-07",
    cameraId: "cam-02",
    cameraName: "Cámara 02 – Sala de estar",
    alertType: "sospechoso",
    channel: "email",
    timestamp: "2025-07-24T23:12:00Z",
    acknowledged: false,
  },
  {
    id: "ev-08",
    cameraId: "cam-01",
    cameraName: "Cámara 01 – Frente de casa",
    alertType: "intruso",
    channel: "whatsapp",
    timestamp: "2025-07-24T19:30:00Z",
    acknowledged: true,
    acknowledgedBy: "Luciana García",
    acknowledgedAt: "2025-07-24T19:33:20Z",
  },
  {
    id: "ev-09",
    cameraId: "cam-04",
    cameraName: "Cámara 04 – Garage",
    alertType: "sospechoso",
    channel: "llamada",
    timestamp: "2025-07-23T07:45:00Z",
    acknowledged: false,
  },
  {
    id: "ev-10",
    cameraId: "cam-03",
    cameraName: "Cámara 03 – Patio trasero",
    alertType: "intruso",
    channel: "email",
    timestamp: "2025-07-22T14:22:00Z",
    acknowledged: true,
    acknowledgedBy: "Martín López",
    acknowledgedAt: "2025-07-22T14:25:50Z",
  },
]
