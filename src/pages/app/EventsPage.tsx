import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/common/PageHeader"
import Badge from "@/components/common/Badge"
import Button from "@/components/common/Button"
import { useEvents } from "@/hooks/useEvents"
import { useMembers } from "@/hooks/useMembers"
import { ApiError } from "@/lib/http"
import { displayName } from "@/lib/members"
import type { AlertType, ChannelType } from "@/data/mockData"
import { Filter, CheckCircle, Clock, Phone, Mail, MessageSquare } from "lucide-react"

const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  llamada: <Phone size={13} />,
  whatsapp: <MessageSquare size={13} />,
  email: <Mail size={13} />,
}

const CHANNEL_LABELS: Record<ChannelType, string> = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
}

const HEAD_CELL = "text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatAckTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
}

export default function EventsPage() {
  const [filterAlert, setFilterAlert] = useState<AlertType | "all">("all")
  const [filterDate, setFilterDate] = useState("")

  // Both filters are server-side: the route pages by keyset, so filtering the
  // loaded pages instead would hide matches that live further back.
  const events = useEvents({
    alertType: filterAlert === "all" ? undefined : filterAlert,
    from: filterDate || undefined,
  })
  // The event carries `acknowledgedByUserId`; the roster is where the name is.
  const members = useMembers()

  const rows = events.data?.pages.flatMap((page) => page.items) ?? []
  const namesByUserId = new Map(
    (members.data?.items ?? []).map((member) => [member.id, displayName(member)]),
  )

  // No total on the page DTO, so this counts what is loaded. The `+` says there
  // is another page rather than claiming a total the backend never sent.
  const subtitle = events.data
    ? `${rows.length}${events.hasNextPage ? "+" : ""} eventos registrados`
    : "Cargando eventos…"

  return (
    <AppShell>
      <PageHeader title="Eventos de seguridad" subtitle={subtitle} />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Filter size={14} />
          <span>Filtrar:</span>
        </div>
        <div className="flex gap-2">
          {(["all", "intruso", "sospechoso"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterAlert(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                filterAlert === type
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {type === "all" ? "Todos" : type === "intruso" ? "Intruso" : "Sospechoso"}
            </button>
          ))}
        </div>
        <input
          type="date"
          aria-label="Desde"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-600"
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate("")}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Limpiar fecha
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {events.isPending ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando eventos…</p>
        ) : events.isError ? (
          <p role="alert" className="px-4 py-6 text-sm text-destructive">
            {events.error instanceof ApiError
              ? events.error.message
              : "No pudimos cargar los eventos."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={HEAD_CELL}>Cámara</th>
                  <th className={HEAD_CELL}>Tipo</th>
                  <th className={HEAD_CELL}>Canal</th>
                  <th className={HEAD_CELL}>Fecha y hora</th>
                  <th className={HEAD_CELL}>Reconocimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No hay eventos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  rows.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium">{ev.cameraName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ev.alertType} />
                      </td>
                      <td className="px-4 py-3">
                        {ev.channels.length === 0 ? (
                          <span className="text-gray-400 text-xs">Sin envío</span>
                        ) : (
                          <span className="flex items-center gap-3 text-gray-600">
                            {ev.channels.map((channel) => (
                              <span key={channel} className="flex items-center gap-1.5">
                                {CHANNEL_ICONS[channel]}
                                {CHANNEL_LABELS[channel]}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatTimestamp(ev.timestamp)}</td>
                      <td className="px-4 py-3">
                        {ev.acknowledgedAt ? (
                          <div className="flex items-start gap-1.5">
                            <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-gray-800 text-xs font-medium">
                                Reconocido por{" "}
                                {(ev.acknowledgedByUserId !== null &&
                                  namesByUserId.get(ev.acknowledgedByUserId)) ||
                                  "un miembro"}
                              </p>
                              <p className="text-gray-400 text-xs">
                                · {formatAckTime(ev.acknowledgedAt)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <Clock size={14} />
                            <span className="text-xs">No reconocido</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {events.hasNextPage && (
        <div className="flex justify-center mt-5">
          <Button
            variant="secondary"
            onClick={() => events.fetchNextPage()}
            disabled={events.isFetchingNextPage}
          >
            {events.isFetchingNextPage ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      )}
    </AppShell>
  )
}
