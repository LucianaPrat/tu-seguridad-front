import { Navigate, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { useCompleteProfile } from "@/hooks/useAuth"
import { useSessionStore } from "@/stores/sessionStore"
import { ApiError } from "@/lib/http"
import { completeProfileSchema, type CompleteProfileValues } from "@/lib/schemas"

/*
 * Where an accepted invitation lands. The account exists but carries no name,
 * no phone and a password it cannot log in with, and the backend answers 403 on
 * every other route until this form succeeds — so this is the only screen the
 * invitee can reach.
 */
function completeErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "No pudimos guardar tus datos. Intentá de nuevo."
}

export default function CompleteProfilePage() {
  const { isLoggedIn, user } = useSessionStore()
  const complete = useCompleteProfile()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      password: "",
      repeatPassword: "",
    },
  })

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (user?.profileCompleted) return <Navigate to="/" replace />

  async function onSubmit({ repeatPassword: _repeat, ...payload }: CompleteProfileValues) {
    try {
      await complete.mutateAsync(payload)
      navigate("/", { replace: true })
    } catch {
      // Rendered from complete.error below. Swallowed only so the promise
      // settles and isSubmitting releases the button.
    }
  }

  return (
    <AuthCard title="Completá tu perfil" subtitle="Últimos datos antes de entrar al espacio">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {complete.isError && (
          <p role="alert" className="text-sm text-destructive">
            {completeErrorMessage(complete.error)}
          </p>
        )}
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
          label="Teléfono móvil"
          type="tel"
          placeholder="+5491112345678"
          hint="Formato internacional, con código de país"
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
          Guardar y entrar
        </Button>
      </form>
    </AuthCard>
  )
}
