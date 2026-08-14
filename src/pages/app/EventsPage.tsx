import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/ui/PageHeader"
import Badge from "@/components/ui/Badge"
import { EVENTS, type AlertType } from "@/data/mockData"
import { Filter, CheckCircle, Clock, Phone, Mail, MessageSquare } from "lucide-react"

const CHANNEL_ICONS = {
  llamada: <Phone size={13} />,
  whatsapp: <MessageSquare size={13} />,
  email: <Mail size={13} />,
}

const CHANNEL_LABELS = {
  llamada: "Llamada",
  whatsapp: "WhatsApp",
  email: "Email",
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatAckTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
}

export default function EventsPage() {
  const [filterAlert, setFilterAlert] = useState<AlertType | "all">("all")
  const [filterDate, setFilterDate] = useState("")

  const filtered = EVENTS.filter((ev) => {
    if (filterAlert !== "all" && ev.alertType !== filterAlert) return false
    if (filterDate) {
      const evDate = ev.timestamp.slice(0, 10)
      if (evDate < filterDate) return false
    }
    return true
  })

  return (
    <AppShell>
      <PageHeader
        title="Eventos de seguridad"
        subtitle={`${EVENTS.length} eventos registrados`}
      />

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
                  ? "bg-[#1a6b61] text-white border-[#1a6b61]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {type === "all" ? "Todos" : type === "intruso" ? "Intruso" : "Sospechoso"}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30 text-gray-600"
        />
        {filterDate && (
          <button onClick={() => setFilterDate("")} className="text-xs text-gray-400 hover:text-gray-600">
            Limpiar fecha
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cámara</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reconocimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No hay eventos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800 font-medium">{ev.cameraName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ev.alertType} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-gray-600">
                        {CHANNEL_ICONS[ev.channel]}
                        {CHANNEL_LABELS[ev.channel]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatTimestamp(ev.timestamp)}</td>
                    <td className="px-4 py-3">
                      {ev.acknowledged ? (
                        <div className="flex items-start gap-1.5">
                          <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-gray-800 text-xs font-medium">Reconocido por {ev.acknowledgedBy}</p>
                            <p className="text-gray-400 text-xs">· {formatAckTime(ev.acknowledgedAt!)}</p>
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
      </div>
    </AppShell>
  )
}
