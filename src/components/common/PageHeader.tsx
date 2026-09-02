import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && (
        <div className="shrink-0 max-sm:w-full [&>button]:max-sm:w-full" data-tour="page-action">
          {action}
        </div>
      )}
    </div>
  )
}
