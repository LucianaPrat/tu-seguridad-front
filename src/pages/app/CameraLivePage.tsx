import { useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Loader2, Radio, WifiOff } from "lucide-react"
import LiveThumbnail from "@/components/camera/LiveThumbnail"
import { useCameras } from "@/hooks/useCameras"
import { useT } from "@/hooks/useT"

/**
 * Full-screen live view of one camera. Where a dashboard card lands, so it is
 * gated on `home` only: a guest sees the cameras assigned to them, and the
 * backend's CameraAccessGuard on GET /cameras/:id/live and the media server's
 * per-segment hook enforce that, not this page.
 *
 * ponytail: no 8 s "never came up" timeout like the card has. Add it if a hung
 * muxer leaves people staring at a spinner.
 */
export default function CameraLivePage() {
  const { id = "" } = useParams()
  const { t } = useT()
  const { data: cameras } = useCameras()
  const camera = cameras?.find((c) => c.id === id)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="fixed inset-0 bg-black">
      <LiveThumbnail
        videoRef={videoRef}
        cameraId={id}
        onPlaying={() => setPlaying(true)}
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-contain"
      />

      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 p-4 bg-gradient-to-b from-black/70 to-transparent text-white">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            aria-label={t("cameras.backToHome")}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60"
          >
            <ArrowLeft size={18} />
          </Link>
          <p className="font-semibold truncate">{camera?.name}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0">
          {failed ? (
            <>
              <WifiOff size={12} className="text-amber-300" />
              {t("cameras.noSignal")}
            </>
          ) : playing ? (
            <>
              <Radio size={12} className="text-red-400 animate-pulse" />
              {t("cameras.live")}
            </>
          ) : (
            <>
              <Loader2 size={12} className="animate-spin" />
              {t("cameras.connecting")}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
