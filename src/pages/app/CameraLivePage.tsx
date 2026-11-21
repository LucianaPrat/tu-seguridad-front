import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronDown, ChevronUp, Home, Loader2, RotateCw, WifiOff } from "lucide-react"
import type { Camera } from "@/api/cameras"
import CameraSwitcher from "@/components/camera/CameraSwitcher"
import LiveThumbnail from "@/components/camera/LiveThumbnail"
import { cameraKeys, useCameras, useSnapshotImage } from "@/hooks/useCameras"
import { useT } from "@/hooks/useT"
import { dateLocale } from "@/lib/i18n"

/**
 * A stream can hang without ever failing: the media server answers the playlist
 * from a muxer that never produces a segment. Same ceiling as the card.
 */
const LIVE_TIMEOUT_MS = 8000

/**
 * Full-screen live view of one camera. Where a dashboard card lands, so it is
 * gated on `home` only: a guest sees the cameras assigned to them, and the
 * backend's CameraAccessGuard on GET /cameras/:id/live and the media server's
 * per-segment hook enforce that, not this page.
 */
export default function CameraLivePage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { t } = useT()
  const { data: cameras } = useCameras()
  const [stripOpen, setStripOpen] = useState(true)

  // Same bucket as the dashboard grid: the cameras a card would link here from.
  const watchable = (cameras ?? []).filter((c) => c.isConfigured && c.isEnabled)
  const camera = cameras?.find((c) => c.id === id)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") return navigate("/")
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      const index = watchable.findIndex((c) => c.id === id)
      if (index < 0 || watchable.length < 2) return
      const step = event.key === "ArrowRight" ? 1 : -1
      const next = watchable[(index + step + watchable.length) % watchable.length]
      navigate(`/cameras/${next.id}/live`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Same route, new :id does not remount — the key drops the old stream and its state. */}
      <LiveView key={id} cameraId={id} camera={camera} />

      <header className="absolute top-0 inset-x-0 flex items-center gap-3 p-4 bg-gradient-to-b from-black/80 to-transparent text-white">
        <Link
          to="/"
          aria-label={t("cameras.backToHome")}
          className="flex items-center gap-2 shrink-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-sm font-medium"
        >
          <Home size={16} />
          <span className="hidden sm:inline">{t("cameras.home")}</span>
        </Link>
        <div className="h-6 w-px bg-white/20 shrink-0" />
        {camera && (
          <div className="min-w-0">
            <h1 className="font-semibold truncate leading-tight">{camera.name}</h1>
            <p className="text-xs text-white/60 truncate">
              {camera.location ?? t("cameras.channelN", { id: camera.externalId })}
            </p>
          </div>
        )}
      </header>

      {watchable.length > 1 && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setStripOpen((open) => !open)}
              aria-expanded={stripOpen}
              className="flex items-center gap-1 rounded-t-md px-3 py-1 text-xs text-white/80 hover:text-white"
            >
              {stripOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {stripOpen ? t("cameras.hideCameras") : t("cameras.showCameras")}
            </button>
          </div>
          {stripOpen && <CameraSwitcher cameras={watchable} currentId={id} />}
        </div>
      )}
    </div>
  )
}

/** The player plus everything that resets when the camera changes. */
function LiveView({ cameraId, camera }: { cameraId: string; camera: Camera | undefined }) {
  const { t } = useT()
  const queryClient = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const snapshotUrl = useSnapshotImage(camera?.snapshotUrl ?? null, camera?.lastSnapshotAt ?? null)

  useEffect(() => {
    if (playing || failed) return
    const timer = setTimeout(() => setFailed(true), LIVE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [playing, failed, attempt])

  function retry() {
    // useCameraLive never retries on its own; dropping the cached answer makes
    // the remounted player ask the API again.
    queryClient.removeQueries({ queryKey: cameraKeys.live(cameraId) })
    setPlaying(false)
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <>
      {/* The last stored frame stands in while the stream comes up, instead of black. */}
      {!playing && snapshotUrl && (
        <img
          src={snapshotUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain opacity-40 blur-sm"
        />
      )}

      <LiveThumbnail
        key={attempt}
        videoRef={videoRef}
        cameraId={cameraId}
        onPlaying={() => setPlaying(true)}
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-contain"
      />

      {!playing && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white"
        >
          {failed ? (
            <>
              <WifiOff size={40} className="text-amber-300" />
              <p className="text-lg font-semibold">{t("cameras.noSignal")}</p>
              <p className="text-sm text-white/70 max-w-xs">{t("cameras.noSignalHint")}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-2 flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium"
              >
                <RotateCw size={16} />
                {t("cameras.retry")}
              </button>
            </>
          ) : (
            <>
              <Loader2 size={40} className="animate-spin" />
              <p className="text-sm text-white/80">
                {camera
                  ? t("cameras.connectingTo", { name: camera.name })
                  : t("cameras.connecting")}
              </p>
            </>
          )}
        </div>
      )}

      {playing && <LiveBadge />}
    </>
  )
}

/** Red dot, "EN VIVO" and a ticking clock: reads as real time at a glance. */
function LiveBadge() {
  const { t, locale } = useT()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">
      <span className="relative flex size-2.5">
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        <span className="relative size-2.5 rounded-full bg-red-500" />
      </span>
      {t("cameras.live")}
      <span className="font-mono font-normal text-white/80 tabular-nums">
        {now.toLocaleTimeString(dateLocale(locale), { hour12: false })}
      </span>
    </div>
  )
}
