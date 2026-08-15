import { useState, useRef } from "react"
import { MoreHorizontal, Radio, Settings } from "lucide-react"
import type { Camera } from "@/data/mockData"
import Badge from "@/components/common/Badge"
import { useNavigate } from "react-router-dom"

interface CameraCardProps {
  camera: Camera
  onToggleEnabled?: (id: string) => void
}

export default function CameraCard({ camera, onToggleEnabled }: CameraCardProps) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group cursor-pointer transition-shadow hover:shadow-md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-900">
        <img
          src={camera.snapshotUrl}
          alt={`${camera.name} – ${camera.location}`}
          className={`w-full h-full object-cover transition-all duration-300 ${hovered ? "scale-105" : ""}`}
        />

        {/* Live overlay on hover */}
        {hovered && camera.status === "online" && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full text-white text-xs font-semibold">
              <Radio size={12} className="text-red-400 animate-pulse" />
              EN VIVO
            </div>
          </div>
        )}

        {/* Status badge top-left */}
        <div className="absolute top-2 left-2">
          <Badge variant={camera.status === "online" ? "online" : "offline"} />
        </div>

        {/* Unconfigured overlay */}
        {!camera.isConfigured && (
          <div className="absolute top-2 right-2">
            <Badge variant="unconfigured" />
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{camera.name}</p>
          <p className="text-xs text-gray-400 truncate">{camera.location}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {camera.status === "online" && (
            <span className="text-xs text-gray-400">{camera.snapshotAge}</span>
          )}
          {/* Context menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44">
                  <button
                    onClick={() => { navigate("/cameras/monitor"); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Settings size={14} /> Configurar
                  </button>
                  <button
                    onClick={() => { onToggleEnabled?.(camera.id); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {camera.isEnabled ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => { navigate("/events"); setMenuOpen(false) }}
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
