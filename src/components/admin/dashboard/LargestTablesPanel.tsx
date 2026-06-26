import type { LargestTableMetric } from '@/lib/adminDashboardApi'

type LargestTablesPanelProps = {
  tables: LargestTableMetric[]
  loading?: boolean
}

export function LargestTablesPanel({ tables, loading = false }: LargestTablesPanelProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl bg-slate-50/60">
        <div className="px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2 p-4 pt-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted/60" />
          ))}
        </div>
      </div>
    )
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50/60 p-4 text-sm text-muted-foreground">
        No table size data available.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-slate-50/60">
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Largest tables (public schema)</h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Row counts are approximate planner estimates.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="border-y border-slate-200/50 bg-white/50 text-muted-foreground">
              <th scope="col" className="px-4 py-2 font-medium">
                Table
              </th>
              <th scope="col" className="px-4 py-2 font-medium text-right">
                ~Rows
              </th>
              <th scope="col" className="px-4 py-2 font-medium text-right">
                Total size
              </th>
            </tr>
          </thead>
          <tbody>
            {tables.map((row, index) => (
              <tr
                key={`${row.schema_name}.${row.table_name}`}
                className={index > 0 ? 'border-t border-slate-100/80' : undefined}
              >
                <td className="px-4 py-2.5 font-mono text-[11px] text-foreground">{row.table_name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.row_estimate.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-medium text-foreground">
                  {row.total_size_pretty || 'Not available'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
