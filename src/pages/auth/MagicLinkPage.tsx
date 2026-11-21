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
import { Mail, ArrowLeft, CheckCircle, Construction } from "lucide-react"

export default function MagicLinkPage() {
  const { t } = useT()
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
    <AuthCard title={t("auth.magic.title")} subtitle={t("auth.magic.subtitle")}>
      {sentTo ? (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
            <CheckCircle size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t("common.checkEmail")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.magic.sentTo")}{" "}
              <span className="font-medium text-secondary-foreground">{sentTo}</span>
              {t("auth.magic.sentToTail")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("auth.magic.spam")}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="text-sm text-primary hover:underline mt-1 inline-flex items-center py-2"
          >
            {t("auth.magic.retry")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-secondary-foreground">{t("auth.magic.intro")}</p>
          <FormField
            label={t("common.email")}
            type="email"
            placeholder={t("members.invite.emailPlaceholder")}
            error={errors.email?.message}
            {...register("email")}
          />
          <NotImplemented className="block">
            <Button
              type="submit"
              disabled
              loading={isSubmitting}
              icon={<Mail size={14} />}
              className="w-full"
            >
              {t("auth.magic.submit")}
              <Construction size={14} />
            </Button>
          </NotImplemented>
        </form>
      )}

      <div className="mt-5 pt-4 border-t border-border">
        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-secondary-foreground transition-colors py-2"
        >
          <ArrowLeft size={14} />
          {t("common.backToLogin")}
        </Link>
      </div>
    </AuthCard>
  )
}
