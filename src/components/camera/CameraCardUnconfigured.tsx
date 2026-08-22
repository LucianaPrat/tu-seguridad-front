import { Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Camera } from "@/api/cameras"
import { useSnapshotImage } from "@/hooks/useCameras"

interface CameraCardUnconfiguredProps {
  camera: Camera
}

/** A camera the recorder reported but nobody has set up yet. No live view — it
 * has no monitoring behaviour to watch. */
export default function CameraCardUnconfigured({ camera }: CameraCardUnconfiguredProps) {
  const navigate = useNavigate()
  const snapshotUrl = useSnapshotImage(camera.snapshotUrl, camera.lastSnapshotAt)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Thumbnail - greyscale with gear overlay */}
      <div className="relative aspect-video overflow-hidden bg-gray-800">
        {snapshotUrl && (
          <img
            src={snapshotUrl}
            alt={`Última captura de ${camera.name}`}
            className="w-full h-full object-cover grayscale opacity-40"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <button
            onClick={() => navigate(`/cameras/monitor?camera=${camera.id}`)}
            className="flex flex-col items-center gap-1.5 group"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Settings size={18} className="text-white" />
            </div>
            <span className="text-white text-xs font-medium">Configurar</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-gray-900 truncate">{camera.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {camera.location ?? `Canal ${camera.externalId}`}
        </p>
      </div>
    </div>
  )
}
