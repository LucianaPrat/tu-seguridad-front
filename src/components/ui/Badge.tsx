interface BadgeProps {
  variant: "online" | "offline" | "intruso" | "sospechoso" | "configured" | "unconfigured" | "active" | "inactive"
  label?: string
  className?: string
}

const VARIANTS = {
  online: "bg-green-100 text-green-700 border border-green-200",
  offline: "bg-red-100 text-red-700 border border-red-200",
  intruso: "bg-red-100 text-red-700 border border-red-200",
  sospechoso: "bg-amber-100 text-amber-700 border border-amber-200",
  configured: "bg-teal-100 text-teal-700 border border-teal-200",
  unconfigured: "bg-gray-100 text-gray-600 border border-gray-200",
  active: "bg-green-100 text-green-700 border border-green-200",
  inactive: "bg-gray-100 text-gray-500 border border-gray-200",
}

const DEFAULT_LABELS: Record<BadgeProps["variant"], string> = {
  online: "En línea",
  offline: "Desconectada",
  intruso: "Intruso",
  sospechoso: "Sospechoso",
  configured: "Configurada",
  unconfigured: "Sin configurar",
  active: "Activo",
  inactive: "Inactivo",
}

export default function Badge({ variant, label, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]} ${className}`}
    >
      {variant === "online" && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      )}
      {variant === "offline" && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      )}
      {label ?? DEFAULT_LABELS[variant]}
    </span>
  )
}
