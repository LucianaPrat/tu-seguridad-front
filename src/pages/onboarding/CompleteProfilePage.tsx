import { Navigate, useNavigate } from "react-router-dom"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import PhoneField from "@/components/common/PhoneField"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import { useCompleteProfile } from "@/hooks/useAuth"
import { useSessionStore } from "@/stores/sessionStore"
import { ApiError } from "@/lib/http"
import { useT } from "@/hooks/useT"
import { completeProfileSchema, type CompleteProfileValues } from "@/lib/schemas"

/*
 * Where an accepted invitation lands. The account exists but carries no name,
 * no phone and a password it cannot log in with, and the backend answers 403 on
 * every other route until this form succeeds — so this is the only screen the
 * invitee can reach.
 */
export default function CompleteProfilePage() {
  const { t } = useT()
  const { isLoggedIn, user } = useSessionStore()
  const complete = useCompleteProfile()
  const navigate = useNavigate()

  const {
    register,
    control,
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
    <AuthCard title={t("onboarding.profile.title")} subtitle={t("onboarding.profile.subtitle")}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {complete.isError && (
          <p role="alert" className="text-sm text-destructive">
            {complete.error instanceof ApiError
              ? complete.error.message
              : t("onboarding.profile.saveFailed")}
          </p>
        )}
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
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              label={t("auth.register.phone")}
              placeholder="099 123 456"
              hint={t("onboarding.profile.phoneHint")}
              error={errors.phone?.message}
              {...field}
            />
          )}
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
          {t("onboarding.profile.submit")}
        </Button>
      </form>
    </AuthCard>
  )
}
