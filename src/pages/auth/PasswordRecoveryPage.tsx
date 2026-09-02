import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { emailOnlySchema, type EmailOnlyValues } from "@/lib/schemas"
import { Mail } from "lucide-react"

export default function PasswordRecoveryPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  })

  async function onSubmit() {
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSent(true)
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un enlace para restablecerla">
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
            <Mail size={20} className="text-primary" />
          </div>
          <p className="font-medium text-foreground">Revisá tu correo</p>
          <p className="text-sm text-muted-foreground mt-1">
            Si el email está registrado, recibirás el enlace de restablecimiento.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center mt-5 text-sm text-primary font-medium hover:underline py-2"
          >
            Volver al inicio
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-secondary-foreground">
            Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <FormField
            label="Email"
            type="email"
            placeholder="nombre@ejemplo.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Enviar enlace de restablecimiento
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Volver al inicio
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  )
}
