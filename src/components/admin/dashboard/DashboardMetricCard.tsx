import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardMetricCardProps = {
  label: string
  value: number
  icon: LucideIcon
  loading?: boolean
  footnote?: string
}

export function DashboardMetricCard({ label, value, icon: Icon, loading = false, footnote = 'Selected period' }: DashboardMetricCardProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-14 animate-pulse rounded bg-muted" aria-hidden />
          ) : (
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{value.toLocaleString()}</p>
          )}
          {!loading ? <p className="mt-1 text-[10px] text-muted-foreground">{footnote}</p> : null}
        </div>
        <Icon className={cn('h-4 w-4 shrink-0 text-primary/70')} aria-hidden />
      </div>
    </div>
  )
}
