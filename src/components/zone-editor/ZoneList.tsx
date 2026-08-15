import { Trash2 } from "lucide-react"
import type { AlertType, MonitorZone } from "@/data/mockData"
import Badge from "@/components/common/Badge"

interface ZoneListProps {
  zones: MonitorZone[]
  onRemove: (id: string) => void
  onChangeAlertType: (id: string, type: AlertType) => void
}

export default function ZoneList({ zones, onRemove, onChangeAlertType }: ZoneListProps) {
  if (zones.length === 0) {
    return <p className="text-sm text-gray-400 italic">Sin zonas definidas.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {zones.map((zone, i) => (
        <li
          key={zone.id}
          className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100"
        >
          <span className="text-sm text-gray-500 font-medium w-5 shrink-0">#{i + 1}</span>
          <div className="flex-1">
            <select
              value={zone.alertType}
              onChange={(e) => onChangeAlertType(zone.id, e.target.value as AlertType)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1a6b61]/30 bg-white"
            >
              <option value="intruso">Intruso</option>
              <option value="sospechoso">Sospechoso</option>
            </select>
          </div>
          <Badge variant={zone.alertType} />
          <button
            onClick={() => onRemove(zone.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  )
}
