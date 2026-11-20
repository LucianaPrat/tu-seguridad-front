import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom"
import { AlertTriangle, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react"
import AuthCard from "@/components/auth/AuthCard"
import Button from "@/components/common/Button"
import { useAcknowledgeAlert } from "@/hooks/useEvents"
import { ApiError } from "@/lib/http"
import { useT } from "@/hooks/useT"

/*
 * Where the "Marcar como atendida" button of an alert email lands. Public on
 * purpose: the token in the query string is the whole credential, and the
 * person who just opened the mail on their phone is usually not logged in.
 *
 * Nothing is sent until the button is pressed. The backend deliberately keeps
 * this off a GET so link scanners cannot acknowledge an alert on a reader's
 * behalf, and posting on mount would hand that back — a scanner that renders
 * the page runs this component too. One deliberate press is what makes the
 * acknowledgement mean a person saw it.
 */
export default function AcknowledgeAlertPage() {
  const { t } = useT()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const { mutate, isPending, isSuccess, error } = useAcknowledgeAlert()
  const navigate = useNavigate()

  const eventLink = (
    <Link
      to={`/events/${id}`}
      className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline py-2"
    >
      {t("events.ack.viewAlert")}
      <ArrowRight size={14} />
    </Link>
  )

  if (!token) {
    return (
      <AuthCard
        title={t("events.ack.incompleteTitle")}
        subtitle={t("events.ack.incompleteSubtitle")}
      >
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
            <AlertTriangle size={26} className="text-amber-600" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("events.ack.incompleteBefore")}
            <span className="font-medium">Mark as handled</span>
            {t("events.ack.incompleteAfter")}
          </p>
        </div>
        <div className="mt-5 pt-4 border-t border-border">{eventLink}</div>
      </AuthCard>
    )
  }

  if (isSuccess) {
    return (
      <AuthCard title={t("events.ack.doneTitle")} subtitle={t("events.ack.doneSubtitle")}>
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
            <CheckCircle size={26} className="text-primary" />
          </div>
          {/*
           * "Registramos" rather than "marcamos": the route answers the same for
           * a valid token, a repeat and one that fails its signature, so this
           * page cannot honestly claim the alert changed state. The events
           * screen shows who actually acknowledged it.
           */}
          <p className="text-sm text-muted-foreground">{t("events.ack.doneBody")}</p>
        </div>
        <Button onClick={() => navigate("/")} className="w-full mt-4">
          {t("events.ack.goToPanel")}
        </Button>
        <div className="mt-5 pt-4 border-t border-border">{eventLink}</div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t("events.ack.title")} subtitle={t("events.ack.subtitle")}>
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
          <ShieldCheck size={26} className="text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">{t("events.ack.body")}</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive text-center mt-3">
          {error instanceof ApiError ? error.message : t("events.ack.failed")}
        </p>
      )}

      <Button
        onClick={() => mutate(token)}
        loading={isPending}
        icon={<ShieldCheck size={14} />}
        className="w-full mt-4"
      >
        {t("events.ack.submit")}
      </Button>

      <div className="mt-5 pt-4 border-t border-border">{eventLink}</div>
    </AuthCard>
  )
}
