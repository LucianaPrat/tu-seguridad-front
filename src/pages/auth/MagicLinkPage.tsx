import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { emailOnlySchema, type EmailOnlyValues } from "@/lib/schemas"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function MagicLinkPage() {
  // Held separately so the confirmation copy survives the form reset.
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: EmailOnlyValues) {
    await new Promise((resolve) => setTimeout(resolve, 900))
    setSentTo(values.email)
  }

  function handleRetry() {
    setSentTo(null)
    reset({ email: "" })
  }

  return (
    <AuthCard title="Magic Link" subtitle="Ingresá sin contraseña">
      {sentTo ? (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
            <CheckCircle size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Revisá tu correo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enviamos un enlace de acceso a <span className="font-medium text-secondary-foreground">{sentTo}</span>.
              Hacé clic en el enlace para ingresar automáticamente.
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Si no lo encontrás, revisá la carpeta de spam.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-primary hover:underline mt-1"
          >
            Intentar con otro email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-secondary-foreground">
            Ingresá tu email y te enviamos un enlace para acceder sin necesidad de contraseña.
          </p>
          <FormField
            label="Email"
            type="email"
            placeholder="nombre@ejemplo.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" loading={isSubmitting} icon={<Mail size={14} />} className="w-full">
            Enviar Magic Link
          </Button>
        </form>
      )}

      <div className="mt-5 pt-4 border-t border-border">
        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-secondary-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthCard>
  )
}
