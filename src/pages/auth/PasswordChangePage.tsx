import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import NotImplemented from "@/components/common/NotImplemented"
import { passwordChangeSchema, type PasswordChangeValues } from "@/lib/schemas"
import { useT } from "@/hooks/useT"
import { CheckCircle, Construction } from "lucide-react"

export default function PasswordChangePage() {
  const { t } = useT()
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
    <AuthCard title={t("auth.change.title")} subtitle={t("auth.change.subtitle")}>
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-foreground">{t("auth.change.done")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.change.doneHint")}</p>
          <Link
            to="/login"
            className="inline-flex items-center mt-5 text-sm text-primary font-medium hover:underline py-2"
          >
            {t("common.goToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormField
            label={t("auth.change.newPassword")}
            type="password"
            placeholder={t("auth.change.placeholder")}
            error={errors.password?.message}
            {...register("password")}
          />
          <FormField
            label={t("common.repeatPassword")}
            type="password"
            placeholder={t("common.passwordMask")}
            error={errors.repeat?.message}
            {...register("repeat")}
          />
          <NotImplemented className="block">
            <Button type="submit" disabled loading={isSubmitting} className="w-full">
              {t("auth.change.submit")}
              <Construction size={14} />
            </Button>
          </NotImplemented>
        </form>
      )}
    </AuthCard>
  )
}
