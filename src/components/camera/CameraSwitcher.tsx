import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { VideoOff } from "lucide-react"
import type { Camera } from "@/api/cameras"
import { useSnapshotImage } from "@/hooks/useCameras"
import { useT } from "@/hooks/useT"
import { cn } from "@/lib/utils"

interface CameraSwitcherProps {
  cameras: Camera[]
  currentId: string
}

/**
 * Filmstrip of the cameras the user can watch, for hopping between them without
 * going back to the dashboard. Stored snapshots, not live players: every live
 * tile would make the media server pull RTSP from the recorder.
 */
export default function CameraSwitcher({ cameras, currentId }: CameraSwitcherProps) {
  const { t } = useT()
  return (
    <nav
      aria-label={t("cameras.otherCameras")}
      className="flex gap-2 overflow-x-auto snap-x px-4 pb-4 pt-2"
    >
      {cameras.map((camera) => (
        <Tile key={camera.id} camera={camera} current={camera.id === currentId} />
      ))}
    </nav>
  )
}

function Tile({ camera, current }: { camera: Camera; current: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const snapshotUrl = useSnapshotImage(camera.snapshotUrl, camera.lastSnapshotAt)

  // A switch by keyboard can land on a tile scrolled out of the strip.
  useEffect(() => {
    if (current) ref.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [current])

  return (
    <Link
      ref={ref}
      to={`/cameras/${camera.id}/live`}
      aria-current={current ? "page" : undefined}
      className={cn(
        "relative shrink-0 snap-start w-36 sm:w-40 aspect-video rounded-lg overflow-hidden bg-gray-900 border-2 transition",
        current
          ? "border-primary ring-2 ring-primary/60"
          : "border-white/10 opacity-75 hover:opacity-100 hover:border-white/40",
      )}
    >
      {snapshotUrl ? (
        <img src={snapshotUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <VideoOff size={20} className="absolute inset-0 m-auto text-white/30" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent">
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            camera.status === "online" ? "bg-emerald-400" : "bg-gray-400",
          )}
        />
        <span className="text-xs text-white truncate">{camera.name}</span>
      </div>
    </Link>
  )
}
