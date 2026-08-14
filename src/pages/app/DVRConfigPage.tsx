import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import DVRForm, { type DVRFormValues } from "@/components/dvr/DVRForm"
import PageHeader from "@/components/ui/PageHeader"
import ConfirmModal from "@/components/ui/ConfirmModal"

const DEFAULT_VALUES: DVRFormValues = {
  spaceName: "Mi Espacio Seguro",
  dvrUrl: "http://192.168.1.100:8080",
  dvrUser: "admin",
  dvrPassword: "admin123",
  timezone: "America/Argentina/Buenos_Aires",
}

export default function DVRConfigPage() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<DVRFormValues | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(values: DVRFormValues) {
    setPendingValues(values)
    setConfirmOpen(true)
  }

  function handleConfirm() {
    console.log("Saved DVR config:", pendingValues)
    setConfirmOpen(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AppShell>
      <PageHeader
        title="Configuración de DVR"
        subtitle="Editá la conexión y los datos de tu grabador de video."
      />

      <div className="max-w-lg">
        {saved && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
            Configuración guardada correctamente.
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <DVRForm
            defaultValues={DEFAULT_VALUES}
            onSubmit={handleSubmit}
            submitLabel="Guardar configuración"
            showTestConnection
          />
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Cambiar configuración del DVR"
        message="Modificar la configuración del DVR puede causar que las configuraciones individuales de cámara se pierdan. Esta acción no se puede deshacer fácilmente."
        confirmLabel="Guardar de todos modos"
        requireAcknowledge
        acknowledgeLabel="Entiendo que puede perder las configuraciones de cámara existentes"
      />
    </AppShell>
  )
}
