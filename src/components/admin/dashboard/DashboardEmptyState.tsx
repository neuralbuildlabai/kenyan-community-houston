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
  icon = <BarChart3 className="h-7 w-7 text-muted-foreground/50" aria-hidden />,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50/50 px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
