import { useRef, useState } from "react"
import { PenTool, Square } from "lucide-react"
import type { AlertType, MonitorZone } from "@/data/mockData"
import { bboxOf, MAX_POINTS, rectPoints, toSvgPoints, type Point } from "@/lib/zones"

interface ZoneEditorProps {
  imageUrl: string
  zones: MonitorZone[]
  onChange: (zones: MonitorZone[]) => void
  defaultAlertType: AlertType
}

const ALERT_FILL: Record<AlertType, string> = {
  intruso: "rgba(239,68,68,0.35)",
  sospechoso: "rgba(245,158,11,0.35)",
}

const ALERT_STROKE: Record<AlertType, string> = {
  intruso: "#ef4444",
  sospechoso: "#f59e0b",
}

type Tool = "freehand" | "rect"

const TOOLS = [
  { tool: "freehand" as Tool, label: "Mano alzada", Icon: PenTool },
  { tool: "rect" as Tool, label: "Rectángulo", Icon: Square },
]

const PREVIEW_STYLE = (alertType: AlertType) => ({
  fill: ALERT_FILL[alertType],
  stroke: ALERT_STROKE[alertType],
  strokeWidth: 2,
  strokeDasharray: "4 3",
  vectorEffect: "non-scaling-stroke" as const,
})

/** Percent of frame. Below this the path is a stray click, not a zone. */
const MIN_SIZE = 2
/** Percent of frame between sampled points — smooths the jitter of a fast drag. */
const MIN_STEP = 1

export default function ZoneEditor({
  imageUrl,
  zones,
  onChange,
  defaultAlertType,
}: ZoneEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<Tool>("freehand")
  const [path, setPath] = useState<Point[] | null>(null)

  /**
   * The rectangle tool keeps only the drag anchor and the current corner, so
   * its shape is the box those two span. Free-hand keeps the whole trace.
   */
  function shapeOf(points: Point[]): Point[] {
    if (tool === "freehand") return points
    const box = bboxOf(points)
    return rectPoints(box.x, box.y, box.width, box.height)
  }

  function getRelative(e: React.PointerEvent): Point {
    const rect = containerRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  function onPointerDown(e: React.PointerEvent) {
    // Capture keeps the path coming while the cursor leaves the frame, so a
    // drag off the edge clamps instead of dropping the zone half-drawn.
    e.currentTarget.setPointerCapture(e.pointerId)
    setPath([getRelative(e)])
  }

  function onPointerMove(e: React.PointerEvent) {
    const point = getRelative(e)
    // Updater form, not `path` from the closure: the browser delivers moves
    // faster than React flushes, so several land in one task and every one of
    // them would read the same stale path and overwrite the previous sample.
    setPath((path) => {
      if (!path) return path
      if (tool === "rect") return [path[0], point]
      const last = path[path.length - 1]
      if (Math.abs(point.x - last.x) + Math.abs(point.y - last.y) < MIN_STEP) return path
      // At the cap the outline stops gaining detail but still follows the
      // cursor, so the zone closes where the operator let go either way.
      return path.length >= MAX_POINTS ? [...path.slice(0, -1), point] : [...path, point]
    })
  }

  function onPointerUp() {
    if (!path) return
    const shape = shapeOf(path)
    const box = bboxOf(shape)
    if (shape.length > 2 && box.width > MIN_SIZE && box.height > MIN_SIZE) {
      onChange([...zones, { id: `z-${Date.now()}`, points: shape, alertType: defaultAlertType }])
    }
    setPath(null)
  }

  function updateZone(id: string, patch: Partial<MonitorZone>) {
    onChange(zones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)))
  }

  return (
    <div
      ref={containerRef}
      className="relative select-none cursor-crosshair rounded-xl overflow-hidden bg-gray-900 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img src={imageUrl} alt="Captura de la cámara" className="w-full block pointer-events-none" />

      {/*
        One overlay for every shape. The viewBox is the percent grid the zones
        already live in, so no conversion happens on render; the stroke opts out
        of the non-uniform scale that stretching the box to the frame implies.
      */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {zones.map((zone) => (
          <polygon
            key={zone.id}
            points={toSvgPoints(zone.points)}
            fill={ALERT_FILL[zone.alertType]}
            stroke={ALERT_STROKE[zone.alertType]}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {path &&
          path.length > 1 &&
          (tool === "rect" ? (
            <polygon points={toSvgPoints(shapeOf(path))} {...PREVIEW_STYLE(defaultAlertType)} />
          ) : (
            <polyline points={toSvgPoints(path)} {...PREVIEW_STYLE(defaultAlertType)} />
          ))}
      </svg>

      {/*
        Labels ride on the bounding box — the polygon has no corner to pin to.
        Derived here rather than stored on the zone: the outline is the one
        shape, and a stored box could disagree with it.
      */}
      {zones.map((zone) => {
        const box = bboxOf(zone.points)
        return (
          <div
            key={zone.id}
            className="absolute flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold text-white rounded"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              // A zone drawn against the top edge has no room above it for the
              // label, and the frame clips overflow.
              transform: box.y < 6 ? "none" : "translateY(-100%)",
              backgroundColor: ALERT_STROKE[zone.alertType],
            }}
          >
            <button
              title="Cambiar nivel de alerta"
              onPointerDown={(e) => {
                e.stopPropagation()
                updateZone(zone.id, {
                  alertType: zone.alertType === "intruso" ? "sospechoso" : "intruso",
                })
              }}
            >
              {zone.alertType === "intruso" ? "Intruso" : "Sospechoso"}
            </button>
            <button
              aria-label="Borrar zona"
              className="hover:opacity-70"
              onPointerDown={(e) => {
                e.stopPropagation()
                onChange(zones.filter((z) => z.id !== zone.id))
              }}
            >
              ×
            </button>
          </div>
        )
      })}

      <div
        className="absolute top-2 right-2 flex gap-1 bg-black/60 rounded-lg p-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {TOOLS.map(({ tool: option, label, Icon }) => (
          <button
            key={option}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={tool === option}
            onClick={() => setTool(option)}
            className={`p-1.5 rounded-md transition-colors ${
              tool === option ? "bg-white text-gray-900" : "text-white hover:bg-white/20"
            }`}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>

      {zones.length === 0 && !path && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
            {tool === "freehand"
              ? "Dibujá a mano alzada la zona a monitorear"
              : "Arrastrá para definir una zona rectangular"}
          </p>
        </div>
      )}
    </div>
  )
}
