import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom"
import { AlertTriangle, ArrowRight, CheckCircle, ShieldCheck } from "lucide-react"
import AuthCard from "@/components/auth/AuthCard"
import Button from "@/components/common/Button"
import { useAcknowledgeAlert } from "@/hooks/useEvents"
import { ApiError } from "@/lib/http"

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
      Ver la alerta
      <ArrowRight size={14} />
    </Link>
  )

  if (!token) {
    return (
      <AuthCard title="Enlace incompleto" subtitle="Falta el código de confirmación">
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
            <AlertTriangle size={26} className="text-amber-600" />
          </div>
          <p className="text-sm text-muted-foreground">
            Abrí el botón <span className="font-medium">Mark as handled</span> desde el correo de la
            alerta. Copiar el enlace a mano suele perder parte de la dirección.
          </p>
        </div>
        <div className="mt-5 pt-4 border-t border-border">{eventLink}</div>
      </AuthCard>
    )
  }

  if (isSuccess) {
    return (
      <AuthCard title="Confirmación registrada" subtitle="Gracias por responder">
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
          <p className="text-sm text-muted-foreground">
            Registramos tu confirmación. Si alguien más respondió antes, queda a nombre de esa
            persona.
          </p>
        </div>
        <Button onClick={() => navigate("/")} className="w-full mt-4">
          Ir al panel
        </Button>
        <div className="mt-5 pt-4 border-t border-border">{eventLink}</div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Alerta de seguridad" subtitle="Confirmá que ya la viste">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
          <ShieldCheck size={26} className="text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Al confirmar, la alerta queda marcada como atendida a tu nombre y el resto del equipo deja
          de tener que revisarla.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive text-center mt-3">
          {error instanceof ApiError ? error.message : "No pudimos registrar tu confirmación"}
        </p>
      )}

      <Button
        onClick={() => mutate(token)}
        loading={isPending}
        icon={<ShieldCheck size={14} />}
        className="w-full mt-4"
      >
        Marcar como atendida
      </Button>

      <div className="mt-5 pt-4 border-t border-border">{eventLink}</div>
    </AuthCard>
  )
}
