import { useNavigate } from "react-router-dom"
import { useSessionStore } from "@/stores/sessionStore"
import DVRForm, { type DVRFormValues } from "@/components/dvr/DVRForm"
import { Shield } from "lucide-react"

export default function DVRInitPage() {
  const { initDVR } = useSessionStore()
  const navigate = useNavigate()

  function handleSubmit(values: DVRFormValues) {
    initDVR(values.spaceName)
    navigate("/")
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
          <DVRForm onSubmit={handleSubmit} submitLabel="Conectar y continuar" showTestConnection />
        </div>
      </div>
    </div>
  )
}
