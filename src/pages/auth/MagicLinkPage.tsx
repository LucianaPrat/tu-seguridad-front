import { useState } from "react"
import { Link } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function MagicLinkPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresá un email válido")
      return
    }
    setError("")
    setLoading(true)
    setTimeout(() => { setLoading(false); setSent(true) }, 900)
  }

  return (
    <AuthCard title="Magic Link" subtitle="Ingresá sin contraseña">
      {sent ? (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
            <CheckCircle size={26} className="text-[#1a6b61]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Revisá tu correo</p>
            <p className="text-sm text-gray-500 mt-1">
              Enviamos un enlace de acceso a <span className="font-medium text-gray-700">{email}</span>.
              Hacé clic en el enlace para ingresar automáticamente.
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Si no lo encontrás, revisá la carpeta de spam.
          </p>
          <button
            onClick={() => { setSent(false); setEmail("") }}
            className="text-sm text-[#1a6b61] hover:underline mt-1"
          >
            Intentar con otro email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Ingresá tu email y te enviamos un enlace para acceder sin necesidad de contraseña.
          </p>
          <FormField
            label="Email"
            type="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError("") }}
            error={error}
          />
          <Button type="submit" loading={loading} icon={<Mail size={14} />} className="w-full">
            Enviar Magic Link
          </Button>
        </form>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthCard>
  )
}
