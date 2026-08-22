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

export interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  isActive: boolean
  lastLogin: string
  receiveAlerts: boolean
  avatarUrl?: string
}

export interface ChannelConfig {
  alertType: AlertType
  channels: ChannelType[]
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

export const MEMBERS: Member[] = [
  {
    id: "mem-01",
    firstName: "Luciana",
    lastName: "García",
    email: "luciana@ejemplo.com",
    phone: "+54 9 11 1234-5678",
    isActive: true,
    lastLogin: "2025-07-28T22:00:00Z",
    receiveAlerts: true,
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format",
  },
  {
    id: "mem-02",
    firstName: "Martín",
    lastName: "López",
    email: "martin@ejemplo.com",
    phone: "+54 9 11 9876-5432",
    isActive: true,
    lastLogin: "2025-07-27T15:30:00Z",
    receiveAlerts: true,
  },
  {
    id: "mem-03",
    firstName: "Ana",
    lastName: "Martínez",
    email: "ana@ejemplo.com",
    phone: "+54 9 351 555-0001",
    isActive: false,
    lastLogin: "2025-07-10T09:15:00Z",
    receiveAlerts: false,
  },
  {
    id: "mem-04",
    firstName: "Carlos",
    lastName: "Rodríguez",
    email: "carlos@ejemplo.com",
    phone: "+54 9 11 2222-3333",
    isActive: true,
    lastLogin: "2025-07-28T08:00:00Z",
    receiveAlerts: true,
  },
  {
    id: "mem-05",
    firstName: "Sofía",
    lastName: "Fernández",
    email: "sofia@ejemplo.com",
    phone: "+54 9 261 444-7777",
    isActive: true,
    lastLogin: "2025-07-25T18:45:00Z",
    receiveAlerts: false,
  },
]

export const CHANNEL_CONFIG: ChannelConfig[] = [
  { alertType: "intruso", channels: ["llamada", "whatsapp"] },
  { alertType: "sospechoso", channels: ["email"] },
]
