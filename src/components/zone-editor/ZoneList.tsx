import { Trash2 } from "lucide-react"
import type { AlertType, MonitorZone } from "@/data/mockData"
import AlertTypeToggle from "@/components/common/AlertTypeToggle"

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
          className="flex flex-wrap items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100"
        >
          <span className="text-sm text-gray-500 font-medium w-5 shrink-0">#{i + 1}</span>
          <AlertTypeToggle
            value={zone.alertType}
            onChange={(type) => onChangeAlertType(zone.id, type)}
            size="md"
            className="flex-1"
          />
          <button
            onClick={() => onRemove(zone.id)}
            aria-label={`Borrar zona ${i + 1}`}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  )
}
