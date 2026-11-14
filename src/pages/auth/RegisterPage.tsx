import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { useRegister } from "@/hooks/useAuth"
import { ApiError } from "@/lib/http"
import { registerSchema, type RegisterValues } from "@/lib/schemas"
import { Camera } from "lucide-react"

function registerErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return "Ese email ya está registrado"
    if (error.status === 0) return "No pudimos conectar con el servidor. Revisá tu conexión."
  }
  return "Ocurrió un error. Intentá de nuevo."
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { mutateAsync: submitRegister } = useRegister()

  // Avatar is not part of the validated payload yet — no upload endpoint.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      repeatPassword: "",
    },
  })

  async function onSubmit({ repeatPassword: _repeat, ...values }: RegisterValues) {
    try {
      // The form asks for no space name; the backend requires one.
      await submitRegister({ ...values, spaceName: `Espacio de ${values.firstName}` })
      navigate("/")
    } catch (error) {
      setError("root", { message: registerErrorMessage(error) })
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  return (
    <AuthCard title="Crear cuenta" subtitle="Completá tus datos para registrarte">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {errors.root && (
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
          >
            {errors.root.message}
          </p>
        )}
        {/* Avatar upload */}
        <div className="flex justify-center">
          <label className="cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-input flex items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Camera size={20} className="text-muted-foreground" />
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <p className="text-xs text-primary text-center mt-1">Foto de perfil</p>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label="Nombre"
            placeholder="Luciana"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <FormField
            label="Apellido"
            placeholder="García"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>
        <FormField
          label="Email"
          type="email"
          placeholder="nombre@ejemplo.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Teléfono móvil"
          type="tel"
          placeholder="+5491112345678"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <FormField
          label="Contraseña"
          type="password"
          placeholder="Mínimo 12 caracteres"
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          label="Repetir contraseña"
          type="password"
          placeholder="••••••••"
          error={errors.repeatPassword?.message}
          {...register("repeatPassword")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full mt-1">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        ¿Ya tenés cuenta?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Ingresar
        </Link>
      </p>
    </AuthCard>
  )
}
