import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export const NOT_IMPLEMENTED = "Aún no implementado"

/*
 * Hover target for a control that has no working backend path yet. The control
 * inside is disabled by its caller; this wrapper carries the tooltip and the
 * not-allowed cursor because a disabled shadcn Button sets
 * `pointer-events: none` and would show neither on its own.
 */
export default function NotImplemented({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span title={NOT_IMPLEMENTED} className={cn("cursor-not-allowed", className)}>
      {children}
    </span>
  )
}
