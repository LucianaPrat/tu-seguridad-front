import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Badge from "@/components/common/Badge"
import { useAlertRoutings, useSetAlertRouting } from "@/hooks/useChannels"
import { useMembers, useSetMemberAlerts } from "@/hooks/useMembers"
import { useSessionStore } from "@/stores/sessionStore"
import { ApiError } from "@/lib/http"
import { displayName, initials } from "@/lib/members"
import { type AlertType, type ChannelType } from "@/data/mockData"
import { Phone, Mail, MessageSquare } from "lucide-react"

const ALL_CHANNELS: ChannelType[] = ["llamada", "whatsapp", "email"]
const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  llamada: <Phone size={14} />,
  whatsapp: <MessageSquare size={14} />,
  email: <Mail size={14} />,
}
const CHANNEL_LABELS: Record<ChannelType, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
}
const ALERT_LABELS: Record<AlertType, string> = {
  intruso: "🔴 Intruso",
  sospechoso: "🟡 Sospechoso",
}
// Plain names, no emoji — used for aria-label, where the emoji reads as noise.
const ALERT_NAMES: Record<AlertType, string> = {
  intruso: "Intruso",
  sospechoso: "Sospechoso",
}

export default function CommChannelsPage() {
  const isAdmin = useSessionStore((state) => state.user?.role === "admin")
  const routings = useAlertRoutings()
  const setRouting = useSetAlertRouting()
  const members = useMembers()
  const setMemberAlerts = useSetMemberAlerts()

  const cells = routings.data ?? []
  function cellOf(alertType: AlertType, channel: ChannelType) {
    return cells.find((cell) => cell.alertType === alertType && cell.channel === channel)
  }

  const rows = members.data?.items ?? []

  return (
    <AppShell>
      <PageHeader
        title="Canales de comunicación"
        subtitle={
          isAdmin
            ? "Los cambios se guardan al instante."
            : "Solo un administrador puede cambiar esta configuración."
        }
      />

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Section 1: Alert routing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Enrutamiento de alertas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Seleccioná los canales que se usan para cada tipo de alerta.
            </p>
          </div>
          {setRouting.isError && (
            <p role="alert" className="px-5 py-2 text-xs text-destructive">
              No pudimos guardar el cambio.
            </p>
          )}
          {routings.isPending ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Cargando…</p>
          ) : routings.isError ? (
            <p role="alert" className="px-5 py-6 text-sm text-destructive">
              {routings.error instanceof ApiError
                ? routings.error.message
                : "No pudimos cargar el enrutamiento de alertas."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">
                    Tipo de alerta
                  </th>
                  {ALL_CHANNELS.map((ch) => (
                    <th
                      key={ch}
                      className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500"
                    >
                      <span className="flex flex-col items-center gap-1">
                        {CHANNEL_ICONS[ch]}
                        {CHANNEL_LABELS[ch]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["intruso", "sospechoso"] as AlertType[]).map((alert) => (
                  <tr key={alert} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-800">{ALERT_LABELS[alert]}</td>
                    {ALL_CHANNELS.map((ch) => (
                      <td key={ch} className="text-center px-4 py-3">
                        <input
                          type="checkbox"
                          checked={cellOf(alert, ch)?.enabled ?? false}
                          // Disabling the whole matrix while one write is in flight is
                          // deliberate — the route answers with the full matrix, so two
                          // overlapping writes could clobber each other.
                          disabled={!isAdmin || setRouting.isPending}
                          onChange={() =>
                            setRouting.mutate({
                              alertType: alert,
                              channel: ch,
                              enabled: !(cellOf(alert, ch)?.enabled ?? false),
                            })
                          }
                          aria-label={`${ALERT_NAMES[alert]} por ${CHANNEL_LABELS[ch]}`}
                          className="w-4 h-4 accent-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Recipients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Destinatarios de alertas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Activá o desactivá quiénes reciben las alertas del espacio.
            </p>
          </div>
          {setMemberAlerts.isError && (
            <p role="alert" className="px-5 py-2 text-xs text-destructive">
              No pudimos guardar el cambio.
            </p>
          )}
          {members.isPending ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Cargando…</p>
          ) : members.isError ? (
            <p role="alert" className="px-5 py-6 text-sm text-destructive">
              {members.error instanceof ApiError
                ? members.error.message
                : "No pudimos cargar los miembros del espacio."}
            </p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Todavía no hay miembros en el espacio.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {rows.map((member) => (
                <li key={member.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={displayName(member)}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {initials(member)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{displayName(member)}</p>
                      <p className="text-xs text-gray-400">
                        {member.email}
                        {member.phone ? ` · ${member.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {member.receiveAlerts ? "Activo" : "Inactivo"}
                    </span>
                    {!member.profileCompleted && (
                      <Badge variant="unconfigured" label="Perfil incompleto" />
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={member.receiveAlerts}
                      // Email, not the name: every unfinished invitation shares the
                      // "Sin nombre" fallback, and two of them would label alike.
                      aria-label={`Alertas para ${member.email}`}
                      disabled={!isAdmin || !member.profileCompleted}
                      onClick={() =>
                        setMemberAlerts.mutate({
                          userId: member.id,
                          receiveAlerts: !member.receiveAlerts,
                        })
                      }
                      className={`w-9 h-5 rounded-full transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed ${
                        member.receiveAlerts ? "bg-primary" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          member.receiveAlerts ? "left-4" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}
