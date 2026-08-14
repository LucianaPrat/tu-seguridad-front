import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { passwordChangeSchema, type PasswordChangeValues } from "@/lib/schemas"
import { CheckCircle } from "lucide-react"

export default function PasswordChangePage() {
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: "", repeat: "" },
  })

  async function onSubmit() {
    await new Promise((resolve) => setTimeout(resolve, 800))
    setDone(true)
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle="Elegí una contraseña segura para tu cuenta">
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-foreground">Contraseña actualizada</p>
          <p className="text-sm text-muted-foreground mt-1">Ya podés ingresar con tu nueva contraseña.</p>
          <Link to="/login" className="inline-block mt-5 text-sm text-primary font-medium hover:underline">
            Ir al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register("password")}
          />
          <FormField
            label="Repetir contraseña"
            type="password"
            placeholder="••••••••"
            error={errors.repeat?.message}
            {...register("repeat")}
          />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Cambiar contraseña
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
