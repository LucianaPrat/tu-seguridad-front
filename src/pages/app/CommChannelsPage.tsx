import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Badge from "@/components/common/Badge"
import { useAlertRoutings, useSetAlertRouting } from "@/hooks/useChannels"
import { useMembers, useSetMemberAlerts } from "@/hooks/useMembers"
import { useSessionStore } from "@/stores/sessionStore"
import { ApiError } from "@/lib/http"
import { displayName, initials } from "@/lib/members"
import { type AlertType, type ChannelType } from "@/data/mockData"
import { Phone, Mail, MessageSquare, Construction } from "lucide-react"
import { useT } from "@/hooks/useT"
import type { TranslationKey } from "@/lib/i18n"

const ALL_CHANNELS: ChannelType[] = ["llamada", "whatsapp", "email"]
const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  llamada: <Phone size={14} />,
  whatsapp: <MessageSquare size={14} />,
  email: <Mail size={14} />,
}
/** Only email has a sender on the backend; call and WhatsApp alerts are never sent. */
const CHANNEL_READY: Record<ChannelType, boolean> = {
  llamada: false,
  whatsapp: false,
  email: true,
}
const CHANNEL_LABELS = {
  llamada: "channel.llamada",
  whatsapp: "channel.whatsapp",
  email: "channel.email",
} as const satisfies Record<ChannelType, TranslationKey>
const ALERT_EMOJI: Record<AlertType, string> = {
  intruso: "🔴",
  sospechoso: "🟡",
}
// Plain names, no emoji — used for aria-label, where the emoji reads as noise.
const ALERT_NAMES = {
  intruso: "alert.intruso",
  sospechoso: "alert.sospechoso",
} as const satisfies Record<AlertType, TranslationKey>

export default function CommChannelsPage() {
  const { t } = useT()
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
        title={t("channels.title")}
        subtitle={isAdmin ? t("channels.subtitleAdmin") : t("channels.subtitleMember")}
      />

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Section 1: Alert routing */}
        <div
          data-tour="channels-routing"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-3 sm:px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{t("channels.routing")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("channels.routingHint")}</p>
          </div>
          {setRouting.isError && (
            <p role="alert" className="px-3 sm:px-5 py-2 text-xs text-destructive">
              {t("channels.saveFailed")}
            </p>
          )}
          {routings.isPending ? (
            <p className="px-3 sm:px-5 py-6 text-sm text-muted-foreground">
              {t("channels.loading")}
            </p>
          ) : routings.isError ? (
            <p role="alert" className="px-3 sm:px-5 py-6 text-sm text-destructive">
              {routings.error instanceof ApiError
                ? routings.error.message
                : t("channels.routingLoadError")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-3 sm:px-5 py-2.5 text-xs font-semibold text-gray-500">
                    {t("channels.alertType")}
                  </th>
                  {ALL_CHANNELS.map((ch) => (
                    <th
                      key={ch}
                      title={CHANNEL_READY[ch] ? undefined : t("common.notImplemented")}
                      className={`text-center px-2 sm:px-4 py-2.5 text-xs font-semibold ${
                        CHANNEL_READY[ch] ? "text-gray-500" : "text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      <span className="flex flex-col items-center gap-1">
                        {CHANNEL_ICONS[ch]}
                        <span className="flex items-center gap-1">
                          {t(CHANNEL_LABELS[ch])}
                          {!CHANNEL_READY[ch] && <Construction size={12} />}
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["intruso", "sospechoso"] as AlertType[]).map((alert) => (
                  <tr key={alert} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 sm:px-5 py-3 font-medium text-gray-800">
                      {ALERT_EMOJI[alert]} {t(ALERT_NAMES[alert])}
                    </td>
                    {ALL_CHANNELS.map((ch) => (
                      <td key={ch} className="text-center px-2 sm:px-4 py-3">
                        <label
                          title={CHANNEL_READY[ch] ? undefined : t("common.notImplemented")}
                          className="flex items-center justify-center p-2 cursor-pointer has-disabled:cursor-not-allowed"
                        >
                          <input
                            type="checkbox"
                            checked={cellOf(alert, ch)?.enabled ?? false}
                            // Disabling the whole matrix while one write is in flight is
                            // deliberate — the route answers with the full matrix, so two
                            // overlapping writes could clobber each other.
                            disabled={!isAdmin || setRouting.isPending || !CHANNEL_READY[ch]}
                            onChange={() =>
                              setRouting.mutate({
                                alertType: alert,
                                channel: ch,
                                enabled: !(cellOf(alert, ch)?.enabled ?? false),
                              })
                            }
                            aria-label={t("channels.alertViaChannel", {
                              alert: t(ALERT_NAMES[alert]),
                              channel: t(CHANNEL_LABELS[ch]),
                            })}
                            className="size-5 accent-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 2: Recipients */}
        <div
          data-tour="channels-recipients"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-3 sm:px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{t("channels.recipients")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("channels.recipientsHint")}</p>
          </div>
          {setMemberAlerts.isError && (
            <p role="alert" className="px-3 sm:px-5 py-2 text-xs text-destructive">
              {t("channels.saveFailed")}
            </p>
          )}
          {members.isPending ? (
            <p className="px-3 sm:px-5 py-6 text-sm text-muted-foreground">
              {t("channels.loading")}
            </p>
          ) : members.isError ? (
            <p role="alert" className="px-3 sm:px-5 py-6 text-sm text-destructive">
              {members.error instanceof ApiError ? members.error.message : t("members.loadError")}
            </p>
          ) : rows.length === 0 ? (
            <p className="px-3 sm:px-5 py-6 text-sm text-muted-foreground">
              {t("channels.noMembers")}
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {rows.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 flex-wrap px-3 sm:px-5 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{displayName(member)}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {member.email}
                        {member.phone ? ` · ${member.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">
                      {member.receiveAlerts ? t("badge.active") : t("badge.inactive")}
                    </span>
                    {!member.profileCompleted && (
                      <Badge variant="unconfigured" label={t("members.incomplete")} />
                    )}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={member.receiveAlerts}
                      // Email, not the name: every unfinished invitation shares the
                      // "Sin nombre" fallback, and two of them would label alike.
                      aria-label={t("channels.alertsFor", { email: member.email })}
                      disabled={!isAdmin || !member.profileCompleted}
                      onClick={() =>
                        setMemberAlerts.mutate({
                          userId: member.id,
                          receiveAlerts: !member.receiveAlerts,
                        })
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed ${
                        member.receiveAlerts ? "bg-primary" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          member.receiveAlerts ? "left-5" : "left-0.5"
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
