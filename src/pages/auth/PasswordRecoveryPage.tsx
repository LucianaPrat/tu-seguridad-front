import { useState } from "react"
import { Link } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import { Mail } from "lucide-react"

export default function PasswordRecoveryPage() {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Ingresá un email válido")
      return
    }
    setEmailError("")
    setLoading(true)
    setTimeout(() => { setLoading(false); setSent(true) }, 800)
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un enlace para restablecerla">
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
            <Mail size={20} className="text-[#1a6b61]" />
          </div>
          <p className="font-medium text-gray-900">Revisá tu correo</p>
          <p className="text-sm text-gray-500 mt-1">
            Si el email está registrado, recibirás el enlace de restablecimiento.
          </p>
          <Link to="/login" className="inline-block mt-5 text-sm text-[#1a6b61] font-medium hover:underline">
            Volver al inicio
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <FormField
            label="Email"
            type="email"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
          />
          <Button type="submit" loading={loading} className="w-full">
            Enviar enlace de restablecimiento
          </Button>
          <p className="text-center text-sm text-gray-500">
            <Link to="/login" className="text-[#1a6b61] hover:underline">Volver al inicio</Link>
          </p>
        </form>
      )}
    </AuthCard>
  )
}
