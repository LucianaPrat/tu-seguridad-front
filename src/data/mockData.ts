export type AlertType = "intruso" | "sospechoso"
export type ChannelType = "llamada" | "whatsapp" | "email"
export type MonitorMode = "full" | "partial"

export interface MonitorZone {
  id: string
  x: number
  y: number
  width: number
  height: number
  alertType: AlertType
}

export interface Camera {
  id: string
  name: string
  location: string
  status: "online" | "offline"
  isConfigured: boolean
  isEnabled: boolean
  snapshotUrl: string
  snapshotAge: string
  monitorMode: MonitorMode
  alertType?: AlertType
  zones: MonitorZone[]
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

export const CAMERAS: Camera[] = [
  {
    id: "cam-01",
    name: "Cámara 01",
    location: "Frente de casa",
    status: "online",
    isConfigured: true,
    isEnabled: true,
    snapshotUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "2 min",
    monitorMode: "full",
    alertType: "intruso",
    zones: [],
  },
  {
    id: "cam-02",
    name: "Cámara 02",
    location: "Sala de estar",
    status: "online",
    isConfigured: true,
    isEnabled: true,
    snapshotUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "5 min",
    monitorMode: "partial",
    zones: [
      { id: "z1", x: 10, y: 10, width: 40, height: 35, alertType: "intruso" },
    ],
  },
  {
    id: "cam-03",
    name: "Cámara 03",
    location: "Patio trasero",
    status: "online",
    isConfigured: true,
    isEnabled: true,
    snapshotUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "1 min",
    monitorMode: "full",
    alertType: "sospechoso",
    zones: [],
  },
  {
    id: "cam-04",
    name: "Cámara 04",
    location: "Garage",
    status: "offline",
    isConfigured: true,
    isEnabled: true,
    snapshotUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "1 hr",
    monitorMode: "full",
    alertType: "intruso",
    zones: [],
  },
  {
    id: "cam-05",
    name: "Cámara 05",
    location: "Entrada lateral",
    status: "online",
    isConfigured: false,
    isEnabled: true,
    snapshotUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "3 min",
    monitorMode: "full",
    zones: [],
  },
  {
    id: "cam-06",
    name: "Cámara 06",
    location: "Jardín",
    status: "online",
    isConfigured: false,
    isEnabled: true,
    snapshotUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "7 min",
    monitorMode: "full",
    zones: [],
  },
  {
    id: "cam-07",
    name: "Cámara 07",
    location: "Depósito",
    status: "online",
    isConfigured: false,
    isEnabled: false,
    snapshotUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "12 min",
    monitorMode: "full",
    zones: [],
  },
  {
    id: "cam-08",
    name: "Cámara 08",
    location: "Escaleras",
    status: "offline",
    isConfigured: false,
    isEnabled: true,
    snapshotUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=280&fit=crop&auto=format",
    snapshotAge: "2 hr",
    monitorMode: "full",
    zones: [],
  },
]

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
    avatarUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&auto=format",
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
