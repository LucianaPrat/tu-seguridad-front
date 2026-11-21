import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import AuthCard from "@/components/auth/AuthCard"
import FormField from "@/components/common/FormField"
import Button from "@/components/common/Button"
import NotImplemented from "@/components/common/NotImplemented"
import { emailOnlySchema, type EmailOnlyValues } from "@/lib/schemas"
import { useT } from "@/hooks/useT"
import { Mail, Construction } from "lucide-react"

export default function PasswordRecoveryPage() {
  const { t } = useT()
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
    <AuthCard title={t("auth.recovery.title")} subtitle={t("auth.recovery.subtitle")}>
      {sent ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
            <Mail size={20} className="text-primary" />
          </div>
          <p className="font-medium text-foreground">{t("common.checkEmail")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.recovery.sentHint")}</p>
          <Link
            to="/login"
            className="inline-flex items-center mt-5 text-sm text-primary font-medium hover:underline py-2"
          >
            {t("common.backToStart")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-secondary-foreground">{t("auth.recovery.intro")}</p>
          <FormField
            label={t("common.email")}
            type="email"
            placeholder={t("members.invite.emailPlaceholder")}
            error={errors.email?.message}
            {...register("email")}
          />
          <NotImplemented className="block">
            <Button type="submit" disabled loading={isSubmitting} className="w-full">
              {t("auth.recovery.submit")}
              <Construction size={14} />
            </Button>
          </NotImplemented>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              {t("common.backToStart")}
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  )
}
