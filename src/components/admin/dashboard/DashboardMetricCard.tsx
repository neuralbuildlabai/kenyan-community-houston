import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardMetricCardProps = {
  label: string
  value: number
  icon: LucideIcon
  loading?: boolean
  footnote?: string
  layout?: 'card' | 'strip'
}

export function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  loading = false,
  footnote = 'Selected period',
  layout = 'card',
}: DashboardMetricCardProps) {
  return (
    <div
      className={cn(
        layout === 'card' && 'rounded-xl border border-slate-200/50 bg-white p-4',
        layout === 'strip' && 'px-3 py-3 sm:px-4 sm:py-4'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-14 animate-pulse rounded bg-muted" aria-hidden />
          ) : (
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {value.toLocaleString()}
            </p>
          )}
          {!loading ? <p className="mt-1 text-[10px] text-muted-foreground/80">{footnote}</p> : null}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700/80">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </div>
      </div>
    </div>
  )
}
