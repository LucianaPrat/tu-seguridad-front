import { useState } from "react"
import { MoreHorizontal, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { Camera } from "@/api/cameras"
import { useT } from "@/hooks/useT"
import { useCan } from "@/lib/permissions"

interface CameraCardMenuProps {
  camera: Camera
  onToggleEnabled?: (id: string) => void
}

/** Card action menu, shared by the configured and unconfigured cards. Stops the
 * click here so picking an item does not also trigger the card's navigation. */
export default function CameraCardMenu({ camera, onToggleEnabled }: CameraCardMenuProps) {
  const { t } = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { canView, canEdit } = useCan()
  // PUT /cameras needs admin or collaborator plus the dvr section.
  const canConfigure = canEdit("dvr")
  const canSeeEvents = canView("events")
  const configureUrl = `/cameras/monitor?camera=${camera.id}`

  if (!canConfigure && !canSeeEvents) return null

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={t("cameras.menu.actions", { name: camera.name })}
        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 w-44 max-w-[calc(100vw-2rem)]">
            {canConfigure && (
              <>
                <button
                  onClick={() => {
                    navigate(configureUrl)
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2.5 min-h-11 flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings size={14} /> {t("cameras.menu.configure")}
                </button>
                <button
                  onClick={() => {
                    onToggleEnabled?.(camera.id)
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2.5 min-h-11 flex items-center text-sm text-gray-700 hover:bg-gray-50"
                >
                  {camera.isEnabled ? t("cameras.menu.disable") : t("cameras.menu.enable")}
                </button>
              </>
            )}
            {canSeeEvents && (
              <button
                onClick={() => {
                  navigate("/events")
                  setMenuOpen(false)
                }}
                className="w-full text-left px-3 py-2.5 min-h-11 flex items-center text-sm text-gray-700 hover:bg-gray-50"
              >
                {t("cameras.menu.viewEvents")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
