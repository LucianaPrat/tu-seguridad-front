import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import NotImplemented from "@/components/common/NotImplemented"
import { useRegister } from "@/hooks/useAuth"
import { ApiError } from "@/lib/http"
import { type TranslationKey } from "@/lib/i18n"
import { useT } from "@/hooks/useT"
import { registerSchema, type RegisterValues } from "@/lib/schemas"
import { Camera, Construction } from "lucide-react"

function registerErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiError) {
    if (error.status === 409) return "auth.register.emailTaken"
    if (error.status === 0) return "auth.networkError"
  }
  return "errors.generic"
}

export default function RegisterPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const { mutateAsync: submitRegister } = useRegister()

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
      await submitRegister({
        ...values,
        spaceName: t("auth.register.spaceName", { name: values.firstName }),
      })
      navigate("/")
    } catch (error) {
      setError("root", { message: t(registerErrorKey(error)) })
    }
  }

  return (
    <AuthCard title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}>
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
          <NotImplemented className="flex flex-col items-center opacity-50">
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-input flex items-center justify-center">
              <Camera size={20} className="text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1 flex items-center gap-1">
              {t("auth.register.photo")} <Construction size={12} />
            </p>
          </NotImplemented>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label={t("auth.register.firstName")}
            placeholder={t("auth.register.firstNamePlaceholder")}
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <FormField
            label={t("auth.register.lastName")}
            placeholder={t("auth.register.lastNamePlaceholder")}
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>
        <FormField
          label={t("common.email")}
          type="email"
          placeholder={t("members.invite.emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label={t("auth.register.phone")}
          type="tel"
          placeholder="+5491112345678"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <FormField
          label={t("common.password")}
          type="password"
          placeholder={t("auth.register.passwordPlaceholder")}
          error={errors.password?.message}
          {...register("password")}
        />
        <FormField
          label={t("common.repeatPassword")}
          type="password"
          placeholder={t("common.passwordMask")}
          error={errors.repeatPassword?.message}
          {...register("repeatPassword")}
        />

        <Button type="submit" loading={isSubmitting} className="w-full mt-1">
          {t("auth.register.submit")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-5">
        {t("auth.register.haveAccount")}{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </AuthCard>
  )
}
