import { useState, useRef } from "react"
import type { AlertType, MonitorZone } from "@/data/mockData"

interface ZoneEditorProps {
  imageUrl: string
  zones: MonitorZone[]
  onChange: (zones: MonitorZone[]) => void
  defaultAlertType: AlertType
}

interface DragState {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

const ALERT_COLORS: Record<AlertType, string> = {
  intruso: "rgba(239,68,68,0.35)",
  sospechoso: "rgba(245,158,11,0.35)",
}

const ALERT_BORDER: Record<AlertType, string> = {
  intruso: "#ef4444",
  sospechoso: "#f59e0b",
}

export default function ZoneEditor({
  imageUrl,
  zones,
  onChange,
  defaultAlertType,
}: ZoneEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  function getRelative(e: React.MouseEvent) {
    const rect = containerRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  function onMouseDown(e: React.MouseEvent) {
    const { x, y } = getRelative(e)
    setDrag({ startX: x, startY: y, currentX: x, currentY: y })
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return
    const { x, y } = getRelative(e)
    setDrag((d) => (d ? { ...d, currentX: x, currentY: y } : d))
  }

  function onMouseUp() {
    if (!drag) return
    const w = Math.abs(drag.currentX - drag.startX)
    const h = Math.abs(drag.currentY - drag.startY)
    if (w > 2 && h > 2) {
      const newZone: MonitorZone = {
        id: `z-${Date.now()}`,
        x: Math.min(drag.startX, drag.currentX),
        y: Math.min(drag.startY, drag.currentY),
        width: w,
        height: h,
        alertType: defaultAlertType,
      }
      onChange([...zones, newZone])
    }
    setDrag(null)
  }

  function removeZone(id: string) {
    onChange(zones.filter((z) => z.id !== id))
  }

  return (
    <div
      ref={containerRef}
      className="relative select-none cursor-crosshair rounded-xl overflow-hidden bg-gray-900"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <img src={imageUrl} alt="Camera snapshot" className="w-full block pointer-events-none" />

      {/* Existing zones */}
      {zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            position: "absolute",
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            width: `${zone.width}%`,
            height: `${zone.height}%`,
            backgroundColor: ALERT_COLORS[zone.alertType],
            border: `2px solid ${ALERT_BORDER[zone.alertType]}`,
            borderRadius: "4px",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 text-xs font-semibold text-white rounded flex items-center gap-1"
            style={{ backgroundColor: ALERT_BORDER[zone.alertType] }}
          >
            {zone.alertType === "intruso" ? "Intruso" : "Sospechoso"}
            <button
              className="ml-1 hover:opacity-70"
              onMouseDown={(e) => {
                e.stopPropagation()
                removeZone(zone.id)
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {/* Active drag rectangle */}
      {drag && (
        <div
          style={{
            position: "absolute",
            left: `${Math.min(drag.startX, drag.currentX)}%`,
            top: `${Math.min(drag.startY, drag.currentY)}%`,
            width: `${Math.abs(drag.currentX - drag.startX)}%`,
            height: `${Math.abs(drag.currentY - drag.startY)}%`,
            backgroundColor: ALERT_COLORS[defaultAlertType],
            border: `2px dashed ${ALERT_BORDER[defaultAlertType]}`,
            borderRadius: "4px",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Instruction overlay */}
      {zones.length === 0 && !drag && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
            Arrastrá para definir zonas de monitoreo
          </p>
        </div>
      )}
    </div>
  )
}
