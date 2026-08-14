import { useState } from "react"
import { Link } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import { CheckCircle } from "lucide-react"

export default function PasswordChangePage() {
  const [password, setPassword] = useState("")
  const [repeat, setRepeat] = useState("")
  const [errors, setErrors] = useState({ password: "", repeat: "" })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = { password: "", repeat: "" }
    if (password.length < 8) errs.password = "Mínimo 8 caracteres"
    if (password !== repeat) errs.repeat = "Las contraseñas no coinciden"
    setErrors(errs)
    if (errs.password || errs.repeat) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setDone(true) }, 800)
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle="Elegí una contraseña segura para tu cuenta">
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">Contraseña actualizada</p>
          <p className="text-sm text-gray-500 mt-1">Ya podés ingresar con tu nueva contraseña.</p>
          <Link to="/login" className="inline-block mt-5 text-sm text-[#1a6b61] font-medium hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <FormField
            label="Repetir contraseña"
            type="password"
            placeholder="••••••••"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            error={errors.repeat}
          />
          <Button type="submit" loading={loading} className="w-full">
            Cambiar contraseña
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
