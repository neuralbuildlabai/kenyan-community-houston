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
    return <div className="h-48 animate-pulse rounded-lg bg-muted" aria-label="Loading top pages" />
  }

  if (rows.length === 0) {
    return (
      <DashboardEmptyState
        title="No page views recorded"
        description={`Top accessed pages will appear here for ${periodLabel.toLowerCase()}.`}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="pb-2 pr-3 font-medium">
              Page
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Views
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Clicks
            </th>
            <th scope="col" className="pb-2 font-medium">
              Last access
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row) => {
            const { label, rawPath } = formatAnalyticsPathLabel(row.path)
            return (
              <tr key={row.path}>
                <td className="py-2.5 pr-3 min-w-0">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{rawPath}</p>
                </td>
                <td className="py-2.5 pr-3 tabular-nums">{row.views.toLocaleString()}</td>
                <td className="py-2.5 pr-3 tabular-nums">{row.clicks_on_path.toLocaleString()}</td>
                <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
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
