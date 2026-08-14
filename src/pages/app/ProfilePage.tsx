import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/ui/PageHeader"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import { useSession } from "@/context/SessionContext"
import { Camera, Save, Lock, CheckCircle } from "lucide-react"

export default function ProfilePage() {
  const { user, updateUser } = useSession()

  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null)

  const [passwords, setPasswords] = useState({ current: "", next: "", repeat: "" })
  const [passErrors, setPassErrors] = useState({ current: "", next: "", repeat: "" })
  const [passSaved, setPassSaved] = useState(false)

  function setF(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    updateUser(form)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    const errs = { current: "", next: "", repeat: "" }
    if (!passwords.current) errs.current = "Requerido"
    if (passwords.next.length < 8) errs.next = "Mínimo 8 caracteres"
    if (passwords.next !== passwords.repeat) errs.repeat = "No coincide"
    setPassErrors(errs)
    if (errs.current || errs.next || errs.repeat) return
    setPassSaved(true)
    setPasswords({ current: "", next: "", repeat: "" })
    setTimeout(() => setPassSaved(false), 2500)
  }

  return (
    <AppShell>
      <PageHeader title="Mi perfil" subtitle="Gestioná tu información personal y contraseña." />

      <div className="flex flex-col gap-6 max-w-lg">
        {/* Profile section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Información personal</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1a6b61] flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xl font-semibold">
                    {form.firstName[0]}{form.lastName[0]}
                  </span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center cursor-pointer hover:bg-gray-50">
                <Camera size={12} className="text-gray-500" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="font-medium text-gray-900">{form.firstName} {form.lastName}</p>
              <p className="text-sm text-gray-500">{form.email}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nombre" value={form.firstName} onChange={(e) => setF("firstName", e.target.value)} />
              <FormField label="Apellido" value={form.lastName} onChange={(e) => setF("lastName", e.target.value)} />
            </div>
            <FormField label="Email" type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
            <FormField label="Teléfono móvil" type="tel" value={form.phone} onChange={(e) => setF("phone", e.target.value)} />

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" icon={<Save size={14} />}>Guardar cambios</Button>
              {profileSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle size={14} /> Guardado
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Password section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Cambiar contraseña</h2>
          </div>
          <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
            <FormField
              label="Contraseña actual"
              type="password"
              placeholder="••••••••"
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              error={passErrors.current}
            />
            <FormField
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              error={passErrors.next}
            />
            <FormField
              label="Repetir nueva contraseña"
              type="password"
              placeholder="••••••••"
              value={passwords.repeat}
              onChange={(e) => setPasswords((p) => ({ ...p, repeat: e.target.value }))}
              error={passErrors.repeat}
            />
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" variant="secondary">Cambiar contraseña</Button>
              {passSaved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle size={14} /> Contraseña actualizada
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
