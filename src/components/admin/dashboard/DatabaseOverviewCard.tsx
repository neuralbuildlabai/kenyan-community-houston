import { Database } from 'lucide-react'
import type { DatabaseOverview } from '@/lib/adminDashboardApi'

type DatabaseOverviewCardProps = {
  database: DatabaseOverview
  loading?: boolean
}

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {sub ? <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p> : null}
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

export function DatabaseOverviewCard({ database, loading = false }: DatabaseOverviewCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-white p-4">
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      </div>
    )
  }

  const analyticsSize =
    database.analytics_events_size_pretty ??
    (database.analytics_events_size_bytes != null
      ? `${database.analytics_events_size_bytes.toLocaleString()} B`
      : 'Not available')

  return (
    <div className="rounded-xl border border-border/70 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Database className="h-4 w-4 text-primary/70" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Database</h3>
      </div>
      <div>
        <MetricRow
          label="Total database size"
          value={database.database_size_pretty || 'Not available'}
        />
        <MetricRow label="Public tables" value={database.table_count.toLocaleString()} />
        <MetricRow label="analytics_events size" value={analyticsSize} />
      </div>
      {database.notes ? (
        <p className="mt-3 text-[10px] leading-snug text-muted-foreground">{database.notes}</p>
      ) : null}
    </div>
  )
}
