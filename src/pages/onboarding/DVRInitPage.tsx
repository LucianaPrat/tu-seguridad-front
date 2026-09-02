import { useNavigate } from "react-router-dom"
import { useSessionStore } from "@/stores/sessionStore"
import { useConfigureDvr } from "@/hooks/useDvr"
import DVRForm, { type DVRFormValues } from "@/components/dvr/DVRForm"
import { ApiError } from "@/lib/http"
import { Shield } from "lucide-react"

/*
 * Three different failures, three different next steps. PUT /dvr is admin-only,
 * and the gate routes every member of an unconfigured space here — a plain
 * "check the DVR fields" parks a non-admin in a form they can never submit. The
 * upstream codes mean the opposite of bad data: the fields were fine, the
 * recorder did not answer.
 */
function configureErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Pedile a un admin del espacio que configure el DVR."
    if (error.code === "UPSTREAM_ERROR" || error.code === "UPSTREAM_TIMEOUT")
      return "El DVR no respondió. Revisá que esté encendido y accesible."
  }
  return "No pudimos guardar la configuración. Revisá los datos del DVR e intentá de nuevo."
}

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
    <div className="min-h-dvh bg-[#f4f7f6] flex items-center justify-center p-4">
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          {/* The backend tests the recorder before storing it, so a failure here
              means nothing was saved and the operator can retry as is. */}
          {configure.isError && (
            <p
              role="alert"
              className="mb-4 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
            >
              {configureErrorMessage(configure.error)}
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
