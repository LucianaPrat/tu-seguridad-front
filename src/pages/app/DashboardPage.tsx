import { useState } from "react"
import { ChevronDown, ChevronRight, UserPlus, Camera as CameraIcon } from "lucide-react"
import AppShell from "@/components/layout/AppShell"
import CameraCard from "@/components/camera/CameraCard"
import CameraCardUnconfigured from "@/components/camera/CameraCardUnconfigured"
import CameraGrid from "@/components/camera/CameraGrid"
import Button from "@/components/common/Button"
import PageHeader from "@/components/common/PageHeader"
import InviteModal from "@/components/common/InviteModal"
import { CAMERAS, type Camera } from "@/data/mockData"

export default function DashboardPage() {
  const [cameras, setCameras] = useState<Camera[]>(CAMERAS)
  const [unconfiguredOpen, setUnconfiguredOpen] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)

  const configured = cameras.filter((c) => c.isConfigured && c.isEnabled)
  const unconfigured = cameras.filter((c) => !c.isConfigured)
  const disabled = cameras.filter((c) => c.isConfigured && !c.isEnabled)

  function toggleEnabled(id: string) {
    setCameras((cs) => cs.map((c) => c.id === id ? { ...c, isEnabled: !c.isEnabled } : c))
  }

  return (
    <AppShell>
      <PageHeader
        title="Panel de cámaras"
        subtitle={`${configured.length} cámaras activas`}
        action={
          <Button variant="secondary" icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
            Invitar miembro
          </Button>
        }
      />

      {/* Configured cameras */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <CameraIcon size={16} className="text-[#1a6b61]" />
          <h2 className="text-sm font-semibold text-gray-700">Cámaras configuradas</h2>
          <span className="text-xs text-gray-400">Cámaras activas y listas para monitoreo.</span>
        </div>
        {configured.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            No hay cámaras configuradas aún.
          </div>
        ) : (
          <CameraGrid>
            {configured.map((cam) => (
              <CameraCard key={cam.id} camera={cam} onToggleEnabled={toggleEnabled} />
            ))}
          </CameraGrid>
        )}
      </section>

      {/* Disabled cameras */}
      {disabled.length > 0 && (
        <section className="mb-8">
          <button
            className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500 hover:text-gray-700"
            onClick={() => setUnconfiguredOpen((o) => !o)}
          >
            {unconfiguredOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Cámaras desactivadas ({disabled.length})
          </button>
          {unconfiguredOpen && (
            <CameraGrid>
              {disabled.map((cam) => (
                <CameraCard key={cam.id} camera={cam} onToggleEnabled={toggleEnabled} />
              ))}
            </CameraGrid>
          )}
        </section>
      )}

      {/* Unconfigured cameras */}
      {unconfigured.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CameraIcon size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Cámaras sin configurar</h2>
            <span className="text-xs text-gray-400">Cámaras detectadas que aún no han sido configuradas.</span>
          </div>
          <CameraGrid>
            {unconfigured.map((cam) => (
              <CameraCardUnconfigured key={cam.id} camera={cam} />
            ))}
          </CameraGrid>
        </section>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  )
}
