import { useEffect, useRef, useState } from "react"
import { Loader2, Radio, WifiOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Camera } from "@/api/cameras"
import Badge from "@/components/common/Badge"
import LiveThumbnail from "@/components/camera/LiveThumbnail"
import CameraCardMenu from "@/components/camera/CameraCardMenu"
import { useCaptureSnapshot, useSnapshotImage } from "@/hooks/useCameras"
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

/**
 * A stream can hang without ever failing: the media server answers the playlist
 * from a muxer that never produces a segment. Without this ceiling the
 * connecting pill would spin forever.
 */
const LIVE_TIMEOUT_MS = 8000

/**
 * The recorder takes about a second to answer a capture, and until it does the
 * card would show the stale stored frame again — daylight right after the live
 * feed showed night. The last decoded frame stands in for that second.
 *
 * hls.js feeds the element through MSE, so the buffers are same-origin and the
 * canvas stays readable. Native HLS would taint it, which is what the catch is
 * for: no stand-in is better than a thrown SecurityError.
 */
function grabFrame(video: HTMLVideoElement | null): string | null {
  if (!video?.videoWidth) return null
  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext("2d")?.drawImage(video, 0, 0)
  try {
    // ponytail: data URL, ~100 kB held per hovered card. Swap for
    // toBlob + createObjectURL if that ever shows up in a profile.
    return canvas.toDataURL("image/jpeg", 0.7)
  } catch {
    return null
  }
}

export default function CameraCard({ camera, onToggleEnabled }: CameraCardProps) {
  const [hovered, setHovered] = useState(false)
  const [live, setLive] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [liveError, setLiveError] = useState(false)
  const [lastFrame, setLastFrame] = useState<string | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()
  const capture = useCaptureSnapshot()

  // `handleLeave` clears the timer; unmount does not. The list refetch after
  // `Desactivar` remounts the card under a stationary pointer, so a pending
  // timer would fire into a dead component.
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!live || playing || liveError) return
    const timer = setTimeout(() => setLiveError(true), LIVE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [live, playing, liveError])

  const snapshotUrl = useSnapshotImage(camera.snapshotUrl, camera.lastSnapshotAt)

  // The capture changes the query key, so `snapshotUrl` is null for a moment
  // while the new blob loads — the stand-in has to outlive that gap and only
  // step aside once real bytes are back.
  useEffect(() => {
    if (snapshotUrl) setLastFrame(null)
  }, [snapshotUrl])

  const age = relativeTime(camera.lastSnapshotAt)
  const subtitle = camera.location ?? `Canal ${camera.externalId}`
  // The monitor page reads this id, so configuring "Cámara 04" edits that one.
  const configureUrl = `/cameras/monitor?camera=${camera.id}`
  const thumbnail = lastFrame ?? snapshotUrl

  function handleEnter() {
    setHovered(true)
    if (camera.status !== "online") return
    hoverTimer.current = setTimeout(() => setLive(true), HOVER_DELAY_MS)
  }

  function handleLeave() {
    setHovered(false)
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    // The stored frame can be hours old, so dropping out of a live view would
    // swap tonight's picture back for this morning's. Only after real frames:
    // a stream that never came up says nothing new about the camera.
    if (playing) {
      setLastFrame(grabFrame(videoRef.current))
      if (!capture.isPending) capture.mutate(camera.id)
    }
    setLive(false)
    setPlaying(false)
    setLiveError(false)
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
        {thumbnail ? (
          <img
            src={thumbnail}
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
        {live && (
          <LiveThumbnail
            videoRef={videoRef}
            cameraId={camera.id}
            onPlaying={() => setPlaying(true)}
            onError={() => setLiveError(true)}
          />
        )}

        {/* One pill, three states: connecting, live, failed. Nothing shows
            until a hover actually asked for the stream, and "EN VIVO" still
            waits for real frames — over a still image it would be a lie. */}
        {live && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full text-white text-xs font-semibold">
            {liveError ? (
              <>
                <WifiOff size={12} className="text-amber-300" />
                Sin señal
              </>
            ) : playing ? (
              <>
                <Radio size={12} className="text-red-400 animate-pulse" />
                EN VIVO
              </>
            ) : (
              <>
                <Loader2 size={12} className="animate-spin" />
                Conectando
              </>
            )}
          </div>
        )}

        {/* Status badge top-left */}
        <div className="absolute top-2 left-2">
          <Badge variant={camera.status === "online" ? "online" : "offline"} />
        </div>
      </div>

      {/* Card footer */}
      <div className="px-3 py-3 flex items-center justify-between gap-2">
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
