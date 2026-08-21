import { useRef, useState } from "react"
import { MoreHorizontal, Radio, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Camera } from "@/api/cameras"
import Badge from "@/components/common/Badge"
import LiveThumbnail from "@/components/camera/LiveThumbnail"
import { useSnapshotImage } from "@/hooks/useCameras"
import { relativeTime } from "@/lib/time"
import { cn } from "@/lib/utils"

interface CameraCardProps {
  camera: Camera
  onToggleEnabled?: (id: string) => void
}

/**
 * Dragging the pointer across a 4-up grid would otherwise register every camera
 * it crosses with the media server, and each registration pulls RTSP from the
 * recorder. Hovering has to look deliberate before it costs anything.
 */
const HOVER_DELAY_MS = 300

export default function CameraCard({ camera, onToggleEnabled }: CameraCardProps) {
  const [hovered, setHovered] = useState(false)
  const [live, setLive] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const snapshotUrl = useSnapshotImage(camera.snapshotUrl, camera.lastSnapshotAt)
  const age = relativeTime(camera.lastSnapshotAt)
  const subtitle = camera.location ?? `Canal ${camera.externalId}`
  // The monitor page reads this id, so configuring "Cámara 04" edits that one.
  const configureUrl = `/cameras/monitor?camera=${camera.id}`

  function handleEnter() {
    setHovered(true)
    if (camera.status !== "online") return
    hoverTimer.current = setTimeout(() => setLive(true), HOVER_DELAY_MS)
  }

  function handleLeave() {
    setHovered(false)
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setLive(false)
    setPlaying(false)
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group cursor-pointer transition-shadow hover:shadow-md"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => navigate(configureUrl)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-900">
        {snapshotUrl ? (
          <img
            src={snapshotUrl}
            alt={`Última captura de ${camera.name}`}
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              hovered && "scale-105",
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
            Sin captura
          </div>
        )}

        {/* Live video, layered over the stored frame. Silently absent when the
            deployment has no media server — the snapshot is then the whole card. */}
        {live && <LiveThumbnail cameraId={camera.id} onPlaying={() => setPlaying(true)} />}

        {/* Only once frames are actually arriving. A pill over a still image
            would be stating something false. */}
        {playing && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full text-white text-xs font-semibold">
            <Radio size={12} className="text-red-400 animate-pulse" />
            EN VIVO
          </div>
        )}

        {/* Status badge top-left */}
        <div className="absolute top-2 left-2">
          <Badge variant={camera.status === "online" ? "online" : "offline"} />
        </div>
      </div>

      {/* Card footer */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{camera.name}</p>
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {camera.status === "online" && age && (
            <span className="text-xs text-gray-400">{age}</span>
          )}
          {/* Context menu. Stops the click here so picking an item does not also
              trigger the card's own navigation. */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={`Acciones de ${camera.name}`}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44">
                  <button
                    onClick={() => {
                      navigate(configureUrl)
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings size={14} /> Configurar
                  </button>
                  <button
                    onClick={() => {
                      onToggleEnabled?.(camera.id)
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {camera.isEnabled ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => {
                      navigate("/events")
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Ver eventos
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
