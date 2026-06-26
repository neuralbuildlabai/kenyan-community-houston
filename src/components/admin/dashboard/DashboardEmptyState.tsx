import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'

type DashboardEmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
}

export function DashboardEmptyState({
  title,
  description,
  icon = <BarChart3 className="h-8 w-8 text-muted-foreground/60" aria-hidden />,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  )
}
