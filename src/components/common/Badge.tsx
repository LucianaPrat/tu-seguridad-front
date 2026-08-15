import { Badge as ShadcnBadge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface BadgeProps {
  variant: "online" | "offline" | "intruso" | "sospechoso" | "configured" | "unconfigured" | "active" | "inactive"
  label?: string
  className?: string
}

/**
 * Domain status colours layered over the shadcn/ui Badge. The base `outline`
 * variant supplies shape and focus ring; these classes override the palette.
 */
const VARIANTS = {
  online: "bg-green-100 text-green-700 border-green-200",
  offline: "bg-red-100 text-red-700 border-red-200",
  intruso: "bg-red-100 text-red-700 border-red-200",
  sospechoso: "bg-amber-100 text-amber-700 border-amber-200",
  configured: "bg-teal-100 text-teal-700 border-teal-200",
  unconfigured: "bg-gray-100 text-gray-600 border-gray-200",
  active: "bg-green-100 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
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

const DOT = {
  online: "bg-green-500",
  offline: "bg-red-500",
}

export default function Badge({ variant, label, className }: BadgeProps) {
  const dot = DOT[variant as keyof typeof DOT]

  return (
    <ShadcnBadge variant="outline" className={cn(VARIANTS[variant], className)}>
      {dot && <span aria-hidden="true" className={cn("w-1.5 h-1.5 rounded-full inline-block", dot)} />}
      {label ?? DEFAULT_LABELS[variant]}
    </ShadcnBadge>
  )
}
