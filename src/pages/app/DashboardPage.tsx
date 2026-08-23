import { useState } from "react"
import { ChevronDown, ChevronRight, UserPlus, Camera as CameraIcon } from "lucide-react"
import AppShell from "@/components/layout/AppShell"
import CameraCard from "@/components/camera/CameraCard"
import CameraCardUnconfigured from "@/components/camera/CameraCardUnconfigured"
import CameraGrid from "@/components/camera/CameraGrid"
import Button from "@/components/common/Button"
import PageHeader from "@/components/common/PageHeader"
import InviteModal from "@/components/common/InviteModal"
import { useCameras, useSetCameraEnabled } from "@/hooks/useCameras"
import { useSessionStore } from "@/stores/sessionStore"
import { ApiError } from "@/lib/http"
import { cn } from "@/lib/utils"

const NOTICE = "bg-white rounded-xl border border-gray-100 p-8 text-center text-sm"

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "No pudimos cargar las cámaras"
}

export default function DashboardPage() {
  const { data: cameras, isPending, error } = useCameras()
  const setEnabled = useSetCameraEnabled()
  const [disabledOpen, setDisabledOpen] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  // POST /invitations is admin-only; a member gets no button instead of a 403.
  const isAdmin = useSessionStore((state) => state.user?.role === "admin")

  const all = cameras ?? []
  const configured = all.filter((c) => c.isConfigured && c.isEnabled)
  const unconfigured = all.filter((c) => !c.isConfigured)
  const disabled = all.filter((c) => c.isConfigured && !c.isEnabled)

  // Writes through the API, so the bucket a camera sits in survives a reload.
  function toggleEnabled(id: string) {
    const camera = all.find((c) => c.id === id)
    if (!camera) return
    setEnabled.mutate({ id, isEnabled: !camera.isEnabled })
  }

  return (
    <AppShell>
      <PageHeader
        title="Panel de cámaras"
        subtitle={`${configured.length} cámaras activas`}
        action={
          isAdmin ? (
            <Button
              variant="secondary"
              icon={<UserPlus size={14} />}
              onClick={() => setInviteOpen(true)}
            >
              Invitar miembro
            </Button>
          ) : undefined
        }
      />

      {isPending && <div className={cn(NOTICE, "text-gray-400")}>Cargando cámaras…</div>}

      {error && (
        <div role="alert" className={cn(NOTICE, "text-red-600")}>
          {errorMessage(error)}
        </div>
      )}

      {setEnabled.error && (
        <div role="alert" className="mb-3 text-sm text-red-600">
          {errorMessage(setEnabled.error)}
        </div>
      )}

      {!isPending && !error && (
        <>
          {/* Configured cameras */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <CameraIcon size={16} className="text-[#1a6b61]" />
              <h2 className="text-sm font-semibold text-gray-700">Cámaras configuradas</h2>
              <span className="text-xs text-gray-400">
                Cámaras activas y listas para monitoreo.
              </span>
            </div>
            {configured.length === 0 ? (
              <div className={cn(NOTICE, "text-gray-400")}>No hay cámaras configuradas aún.</div>
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
                onClick={() => setDisabledOpen((o) => !o)}
              >
                {disabledOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                Cámaras desactivadas ({disabled.length})
              </button>
              {disabledOpen && (
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
                <span className="text-xs text-gray-400">
                  Cámaras detectadas que aún no han sido configuradas.
                </span>
              </div>
              <CameraGrid>
                {unconfigured.map((cam) => (
                  <CameraCardUnconfigured key={cam.id} camera={cam} />
                ))}
              </CameraGrid>
            </section>
          )}
        </>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  )
}
