import { useState } from "react"
import AppShell from "@/components/layout/AppShell"
import PageHeader from "@/components/ui/PageHeader"
import Button from "@/components/ui/Button"
import { CHANNEL_CONFIG, MEMBERS, type AlertType, type ChannelType } from "@/data/mockData"
import { Save, Phone, Mail, MessageSquare } from "lucide-react"

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

export default function CommChannelsPage() {
  const [routing, setRouting] = useState<Record<AlertType, ChannelType[]>>({
    intruso: CHANNEL_CONFIG.find((c) => c.alertType === "intruso")?.channels ?? [],
    sospechoso: CHANNEL_CONFIG.find((c) => c.alertType === "sospechoso")?.channels ?? [],
  })
  const [memberAlerts, setMemberAlerts] = useState<Record<string, boolean>>(
    Object.fromEntries(MEMBERS.map((m) => [m.id, m.receiveAlerts])),
  )
  const [saved, setSaved] = useState(false)

  function toggleChannel(alertType: AlertType, channel: ChannelType) {
    setRouting((r) => ({
      ...r,
      [alertType]: r[alertType].includes(channel)
        ? r[alertType].filter((c) => c !== channel)
        : [...r[alertType], channel],
    }))
  }

  function toggleMember(id: string) {
    setMemberAlerts((m) => ({ ...m, [id]: !m[id] }))
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <AppShell>
      <PageHeader
        title="Canales de comunicación"
        subtitle="Configurá cómo se envían las alertas y quiénes las reciben."
        action={
          <Button icon={<Save size={14} />} onClick={handleSave}>
            {saved ? "Guardado" : "Guardar cambios"}
          </Button>
        }
      />

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Section 1: Alert routing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Enrutamiento de alertas</h2>
            <p className="text-xs text-gray-500 mt-0.5">Seleccioná los canales que se usan para cada tipo de alerta.</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Tipo de alerta</th>
                {ALL_CHANNELS.map((ch) => (
                  <th key={ch} className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">
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
                        checked={routing[alert].includes(ch)}
                        onChange={() => toggleChannel(alert, ch)}
                        className="w-4 h-4 accent-[#1a6b61] cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Recipients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Destinatarios de alertas</h2>
            <p className="text-xs text-gray-500 mt-0.5">Activá o desactivá quiénes reciben las alertas del espacio.</p>
          </div>
          <ul className="divide-y divide-gray-50">
            {MEMBERS.map((member) => (
              <li key={member.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.firstName} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1a6b61] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-400">{member.email} · {member.phone}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{memberAlerts[member.id] ? "Activo" : "Inactivo"}</span>
                  <div
                    onClick={() => toggleMember(member.id)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      memberAlerts[member.id] ? "bg-[#1a6b61]" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        memberAlerts[member.id] ? "left-4" : "left-0.5"
                      }`}
                    />
                  </div>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  )
}
