import type { TopPageRow } from '@/lib/adminDashboardApi'
import { formatAnalyticsPathLabel } from '@/lib/dashboardHelpers'
import { formatDateShort, timeAgo } from '@/lib/utils'
import { DashboardEmptyState } from '@/components/admin/dashboard/DashboardEmptyState'

type TopAccessedPagesTableProps = {
  rows: TopPageRow[]
  loading?: boolean
  periodLabel: string
}

export function TopAccessedPagesTable({ rows, loading = false, periodLabel }: TopAccessedPagesTableProps) {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100/80" aria-label="Loading top pages" />
  }

  if (rows.length === 0) {
    return (
      <DashboardEmptyState
        title="No page views recorded"
        description={`Top accessed pages will appear here for ${periodLabel.toLowerCase()}. Analytics will become richer as more visitors use the site.`}
      />
    )
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="pb-2.5 pr-3 font-medium">
              Page
            </th>
            <th scope="col" className="pb-2.5 pr-3 font-medium text-right">
              Views
            </th>
            <th scope="col" className="pb-2.5 pr-3 font-medium text-right">
              Clicks
            </th>
            <th scope="col" className="pb-2.5 font-medium text-right">
              Last access
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const { label, rawPath } = formatAnalyticsPathLabel(row.path)
            return (
              <tr
                key={row.path}
                className={index > 0 ? 'border-t border-slate-50' : undefined}
              >
                <td className="py-3 pr-3 min-w-0">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{rawPath}</p>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums font-medium text-foreground">
                  {row.views.toLocaleString()}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums text-muted-foreground">
                  {row.clicks_on_path.toLocaleString()}
                </td>
                <td className="py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                  {row.last_accessed_at ? (
                    <span title={formatDateShort(row.last_accessed_at)}>{timeAgo(row.last_accessed_at)}</span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
