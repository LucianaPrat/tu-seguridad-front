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
import { useT } from "@/hooks/useT"
import { cn } from "@/lib/utils"

const NOTICE = "bg-white rounded-xl border border-gray-100 p-5 sm:p-8 text-center text-sm"

export default function DashboardPage() {
  const { t } = useT()
  const errorMessage = (error: unknown) =>
    error instanceof ApiError ? error.message : t("cameras.loadError")
  const { data: cameras, isPending, error } = useCameras()
  const setEnabled = useSetCameraEnabled()
  const [disabledOpen, setDisabledOpen] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  // POST /invitations is admin-only; a member gets no button instead of a 403.
  const isAdmin = useSessionStore((state) => state.user?.role === "admin")

  const all = cameras ?? []
  const configured = all.filter((c) => c.isConfigured && c.isEnabled)
  const unconfigured = all.filter((c) => !c.isConfigured && c.isEnabled)
  // Disabled is the last bucket, configured or not — an operator can silence a
  // camera before ever setting it up.
  const disabled = all.filter((c) => !c.isEnabled)

  // Writes through the API, so the bucket a camera sits in survives a reload.
  function toggleEnabled(id: string) {
    const camera = all.find((c) => c.id === id)
    if (!camera) return
    setEnabled.mutate({ id, isEnabled: !camera.isEnabled })
  }

  return (
    <AppShell>
      <PageHeader
        title={t("cameras.dashboard.title")}
        subtitle={t("cameras.dashboard.subtitle", { count: configured.length })}
        action={
          isAdmin ? (
            <Button
              variant="secondary"
              icon={<UserPlus size={14} />}
              onClick={() => setInviteOpen(true)}
            >
              {t("members.invite.title")}
            </Button>
          ) : undefined
        }
      />

      {isPending && (
        <div className={cn(NOTICE, "text-gray-400")}>{t("cameras.dashboard.loading")}</div>
      )}

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
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <CameraIcon size={16} className="text-[#1a6b61]" />
              <h2 className="text-sm font-semibold text-gray-700">
                {t("cameras.dashboard.configured")}
              </h2>
              <span className="text-xs text-gray-400">{t("cameras.dashboard.configuredHint")}</span>
            </div>
            {configured.length === 0 ? (
              <div className={cn(NOTICE, "text-gray-400")}>
                {t("cameras.dashboard.noneConfigured")}
              </div>
            ) : (
              <CameraGrid>
                {configured.map((cam) => (
                  <CameraCard key={cam.id} camera={cam} onToggleEnabled={toggleEnabled} />
                ))}
              </CameraGrid>
            )}
          </section>

          {/* Unconfigured cameras */}
          {unconfigured.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <CameraIcon size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">
                  {t("cameras.dashboard.unconfigured")}
                </h2>
                <span className="text-xs text-gray-400">
                  {t("cameras.dashboard.unconfiguredHint")}
                </span>
              </div>
              <CameraGrid>
                {unconfigured.map((cam) => (
                  <CameraCardUnconfigured
                    key={cam.id}
                    camera={cam}
                    onToggleEnabled={toggleEnabled}
                  />
                ))}
              </CameraGrid>
            </section>
          )}

          {/* Disabled cameras */}
          {disabled.length > 0 && (
            <section>
              <button
                className="flex items-center gap-2 mb-3 flex-wrap py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
                onClick={() => setDisabledOpen((o) => !o)}
              >
                {disabledOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                {t("cameras.dashboard.disabled", { count: disabled.length })}
              </button>
              {disabledOpen && (
                <CameraGrid>
                  {disabled.map((cam) =>
                    cam.isConfigured ? (
                      <CameraCard key={cam.id} camera={cam} onToggleEnabled={toggleEnabled} />
                    ) : (
                      <CameraCardUnconfigured
                        key={cam.id}
                        camera={cam}
                        onToggleEnabled={toggleEnabled}
                      />
                    ),
                  )}
                </CameraGrid>
              )}
            </section>
          )}
        </>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </AppShell>
  )
}
