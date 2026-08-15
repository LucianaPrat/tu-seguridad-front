import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { useSessionStore } from "@/stores/sessionStore"
import {
  profilePasswordSchema,
  profileSchema,
  type ProfilePasswordValues,
  type ProfileValues,
} from "@/lib/schemas"
import { Camera, Save, Lock, CheckCircle } from "lucide-react"

export default function ProfilePage() {
  const { user, updateUser } = useSessionStore()

  const [profileSaved, setProfileSaved] = useState(false)
  const [passSaved, setPassSaved] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    },
  })

  const passwordForm = useForm<ProfilePasswordValues>({
    resolver: zodResolver(profilePasswordSchema),
    defaultValues: { current: "", next: "", repeat: "" },
  })

  // Watched so the avatar initials and header line track what is typed.
  const firstName = profileForm.watch("firstName")
  const lastName = profileForm.watch("lastName")
  const email = profileForm.watch("email")

  function handleProfileSave(values: ProfileValues) {
    updateUser(values)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  function handlePasswordSave() {
    setPassSaved(true)
    passwordForm.reset({ current: "", next: "", repeat: "" })
    setTimeout(() => setPassSaved(false), 2500)
  }

  return (
    <AppShell>
      <PageHeader title="Mi perfil" subtitle="Gestioná tu información personal y contraseña." />

      <div className="flex flex-col gap-6 max-w-lg">
        {/* Profile section */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Información personal</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-foreground text-xl font-semibold">
                    {firstName[0]}{lastName[0]}
                  </span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border shadow flex items-center justify-center cursor-pointer hover:bg-accent">
                <Camera size={12} className="text-muted-foreground" />
                <span className="sr-only">Cambiar foto de perfil</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="font-medium text-foreground">{firstName} {lastName}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <form
            onSubmit={profileForm.handleSubmit(handleProfileSave)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Nombre"
                error={profileForm.formState.errors.firstName?.message}
                {...profileForm.register("firstName")}
              />
              <FormField
                label="Apellido"
                error={profileForm.formState.errors.lastName?.message}
                {...profileForm.register("lastName")}
              />
            </div>
            <FormField
              label="Email"
              type="email"
              error={profileForm.formState.errors.email?.message}
              {...profileForm.register("email")}
            />
            <FormField
              label="Teléfono móvil"
              type="tel"
              error={profileForm.formState.errors.phone?.message}
              {...profileForm.register("phone")}
            />

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
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Cambiar contraseña</h2>
          </div>
          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordSave)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              label="Contraseña actual"
              type="password"
              placeholder="••••••••"
              error={passwordForm.formState.errors.current?.message}
              {...passwordForm.register("current")}
            />
            <FormField
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              error={passwordForm.formState.errors.next?.message}
              {...passwordForm.register("next")}
            />
            <FormField
              label="Repetir nueva contraseña"
              type="password"
              placeholder="••••••••"
              error={passwordForm.formState.errors.repeat?.message}
              {...passwordForm.register("repeat")}
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
