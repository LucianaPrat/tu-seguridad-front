import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import { useSession } from "@/context/SessionContext"
import { Camera } from "lucide-react"

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useSession()

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    repeatPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: "" }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = "Requerido"
    if (!form.lastName.trim()) errs.lastName = "Requerido"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido"
    if (!form.phone.trim()) errs.phone = "Requerido"
    if (form.password.length < 8) errs.password = "Mínimo 8 caracteres"
    if (form.password !== form.repeatPassword) errs.repeatPassword = "Las contraseñas no coinciden"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setTimeout(() => {
      login(form.email)
      navigate("/onboarding/dvr")
    }, 800)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  return (
    <AuthCard title="Crear cuenta" subtitle="Completá tus datos para registrarte">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Avatar upload */}
        <div className="flex justify-center">
          <label className="cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group-hover:border-[#1a6b61] transition-colors">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-gray-400" />
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <p className="text-xs text-[#1a6b61] text-center mt-1">Foto de perfil</p>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombre" placeholder="Luciana" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} error={errors.firstName} />
          <FormField label="Apellido" placeholder="García" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} error={errors.lastName} />
        </div>
        <FormField label="Email" type="email" placeholder="nombre@ejemplo.com" value={form.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
        <FormField label="Teléfono móvil" type="tel" placeholder="+54 9 11 1234-5678" value={form.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
        <FormField label="Contraseña" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={(e) => set("password", e.target.value)} error={errors.password} />
        <FormField label="Repetir contraseña" type="password" placeholder="••••••••" value={form.repeatPassword} onChange={(e) => set("repeatPassword", e.target.value)} error={errors.repeatPassword} />

        <Button type="submit" loading={loading} className="w-full mt-1">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        ¿Ya tenés cuenta?{" "}
        <Link to="/login" className="text-[#1a6b61] font-medium hover:underline">Ingresar</Link>
      </p>
    </AuthCard>
  )
}
