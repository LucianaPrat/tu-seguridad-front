import { useState } from "react"
import { MoreHorizontal, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Camera } from "@/api/cameras"

interface CameraCardMenuProps {
  camera: Camera
  onToggleEnabled?: (id: string) => void
}

/** Card action menu, shared by the configured and unconfigured cards. Stops the
 * click here so picking an item does not also trigger the card's navigation. */
export default function CameraCardMenu({ camera, onToggleEnabled }: CameraCardMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const configureUrl = `/cameras/monitor?camera=${camera.id}`

  return (
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
  )
}
