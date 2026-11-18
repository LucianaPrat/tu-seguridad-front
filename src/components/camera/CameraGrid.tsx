import { type ReactNode } from "react"

interface CameraGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
}

export default function CameraGrid({ children, columns = 4 }: CameraGridProps) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns]

  return <div className={`grid ${colClass} gap-4`}>{children}</div>
}
