import { Eye, ShieldAlert } from "lucide-react"
import type { AlertType } from "@/data/mockData"
import { cn } from "@/lib/utils"

interface AlertTypeToggleProps {
  value: AlertType
  onChange: (type: AlertType) => void
  size?: "sm" | "md"
  className?: string
}

/**
 * Picking the alert level used to be a `<select>`, which hid the colour that
 * every other surface in the app uses to mean "intruso" or "sospechoso". Two
 * buttons carrying that colour make the choice readable at a glance.
 */
const OPTIONS = [
  {
    type: "intruso" as AlertType,
    label: "Intruso",
    Icon: ShieldAlert,
    selected: "border-red-400 bg-red-50 text-red-700",
  },
  {
    type: "sospechoso" as AlertType,
    label: "Sospechoso",
    Icon: Eye,
    selected: "border-amber-400 bg-amber-50 text-amber-700",
  },
]

export default function AlertTypeToggle({
  value,
  onChange,
  size = "md",
  className,
}: AlertTypeToggleProps) {
  return (
    <div role="radiogroup" className={cn("flex gap-2", className)}>
      {OPTIONS.map(({ type, label, Icon, selected }) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          onClick={() => onChange(type)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm",
            value === type ? selected : "border-gray-200 text-gray-600 hover:border-gray-300",
          )}
        >
          <Icon size={size === "sm" ? 13 : 15} />
          {label}
        </button>
      ))}
    </div>
  )
}
