import { useEffect, useRef, useState } from "react"
import { Radio } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Camera } from "@/api/cameras"
import Badge from "@/components/common/Badge"
import LiveThumbnail from "@/components/camera/LiveThumbnail"
import CameraCardMenu from "@/components/camera/CameraCardMenu"
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
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  // `handleLeave` clears the timer; unmount does not. The list refetch after
  // `Desactivar` remounts the card under a stationary pointer, so a pending
  // timer would fire into a dead component.
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

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
          <CameraCardMenu camera={camera} onToggleEnabled={onToggleEnabled} />
        </div>
      </div>
    </div>
  )
}
