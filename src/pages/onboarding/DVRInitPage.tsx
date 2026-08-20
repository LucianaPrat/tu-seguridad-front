import { useNavigate } from "react-router-dom"
import { useSessionStore } from "@/stores/sessionStore"
import { useConfigureDvr } from "@/hooks/useDvr"
import DVRForm, { type DVRFormValues } from "@/components/dvr/DVRForm"
import { Shield } from "lucide-react"

export default function DVRInitPage() {
  const { updateUser } = useSessionStore()
  const configure = useConfigureDvr()
  const navigate = useNavigate()

  function handleSubmit(values: DVRFormValues) {
    configure.mutate(
      {
        url: values.dvrUrl,
        username: values.dvrUser,
        password: values.dvrPassword,
        timezone: values.timezone,
      },
      {
        onSuccess: () => {
          // spaceName has no backend column yet, so it stays a display field
          // in the store. PUT /dvr rejects it as an unknown key.
          updateUser({ spaceName: values.spaceName })
          navigate("/")
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0d4f47] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Configurar DVR</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Antes de continuar, configurá la conexión con tu grabador de video.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* The backend tests the recorder before storing it, so a failure here
              means nothing was saved and the operator can retry as is. */}
          {configure.isError && (
            <p
              role="alert"
              className="mb-4 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
            >
              No pudimos guardar la configuración. Revisá los datos del DVR e intentá de nuevo.
            </p>
          )}
          <DVRForm
            onSubmit={handleSubmit}
            submitLabel="Conectar y continuar"
            showTestConnection
            loading={configure.isPending}
          />
        </div>
      </div>
    </div>
  )
}
