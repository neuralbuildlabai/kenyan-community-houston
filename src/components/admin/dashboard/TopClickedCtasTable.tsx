import type { TopCtaRow } from '@/lib/adminDashboardApi'
import { formatAnalyticsPathLabel, formatSafeCtaHref } from '@/lib/dashboardHelpers'
import { formatDateShort, timeAgo } from '@/lib/utils'
import { DashboardEmptyState } from '@/components/admin/dashboard/DashboardEmptyState'

type TopClickedCtasTableProps = {
  rows: TopCtaRow[]
  loading?: boolean
  periodLabel: string
}

function formatCtaLabel(label: string): string {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TopClickedCtasTable({ rows, loading = false, periodLabel }: TopClickedCtasTableProps) {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100/80" aria-label="Loading top CTAs" />
  }

  if (rows.length === 0) {
    return (
      <DashboardEmptyState
        title="No CTA clicks recorded"
        description={`Top clicked calls-to-action will appear here for ${periodLabel.toLowerCase()}. Analytics will become richer as more visitors use the site.`}
      />
    )
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="pb-2.5 pr-3 font-medium">
              Label
            </th>
            <th scope="col" className="pb-2.5 pr-3 font-medium">
              Page
            </th>
            <th scope="col" className="pb-2.5 pr-3 font-medium text-right">
              Clicks
            </th>
            <th scope="col" className="pb-2.5 font-medium text-right">
              Last click
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const page = formatAnalyticsPathLabel(row.path)
            const safeHref = formatSafeCtaHref(row.element_href)
            return (
              <tr
                key={`${row.element_label}-${row.path}`}
                className={index > 0 ? 'border-t border-slate-50' : undefined}
              >
                <td className="py-3 pr-3 min-w-0">
                  <p className="font-medium text-foreground">{formatCtaLabel(row.element_label)}</p>
                  {safeHref ? <p className="text-[11px] text-muted-foreground truncate">{safeHref}</p> : null}
                </td>
                <td className="py-3 pr-3 min-w-0">
                  <p className="truncate text-muted-foreground">{page.label}</p>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums font-medium text-foreground">
                  {row.clicks.toLocaleString()}
                </td>
                <td className="py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                  {row.last_clicked_at ? (
                    <span title={formatDateShort(row.last_clicked_at)}>{timeAgo(row.last_clicked_at)}</span>
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
