import type { TrendPoint } from '@/lib/dashboardHelpers'
import { buildTrendPolyline, trendSeriesMax } from '@/lib/dashboardHelpers'
import { DashboardEmptyState } from '@/components/admin/dashboard/DashboardEmptyState'

const SERIES = [
  { key: 'page_views' as const, label: 'Page views', color: 'hsl(152 45% 32%)' },
  { key: 'unique_sessions' as const, label: 'Sessions', color: 'hsl(168 42% 38%)' },
  { key: 'clicks' as const, label: 'Clicks', color: 'hsl(38 65% 48%)' },
  { key: 'form_submissions' as const, label: 'Forms', color: 'hsl(210 45% 52%)' },
]

type TrafficTrendPanelProps = {
  points: TrendPoint[]
  loading?: boolean
  periodLabel: string
}

function totalEngagement(points: TrendPoint[]): number {
  return points.reduce(
    (sum, p) => sum + p.page_views + p.unique_sessions + p.clicks + p.form_submissions,
    0
  )
}

export function TrafficTrendPanel({ points, loading = false, periodLabel }: TrafficTrendPanelProps) {
  if (loading) {
    return <div className="h-52 animate-pulse rounded-xl bg-slate-100/80" aria-label="Loading traffic trend" />
  }

  if (points.length === 0) {
    return (
      <DashboardEmptyState
        title="No traffic data yet"
        description={`Public-site analytics will appear here once visitors browse the community platform during ${periodLabel.toLowerCase()}. Analytics will become richer as more visitors use the site.`}
      />
    )
  }

  const max = trendSeriesMax(points)
  const width = 640
  const height = 176
  const isLowData = totalEngagement(points) < 20

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full ring-2 ring-white"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="font-medium">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl bg-gradient-to-b from-slate-50/60 to-white px-2 py-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full min-w-[320px]"
          role="img"
          aria-label={`Traffic and engagement trend for ${periodLabel}`}
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = 8 + (height - 16) * (1 - ratio)
            return (
              <line
                key={ratio}
                x1={8}
                x2={width - 8}
                y1={y}
                y2={y}
                stroke="hsl(214 20% 88%)"
                strokeWidth={1}
              />
            )
          })}
          {SERIES.map((s) => (
            <path
              key={s.key}
              d={buildTrendPolyline(
                points.map((p) => p[s.key]),
                max,
                width,
                height
              )}
              fill="none"
              stroke={s.color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              opacity={max === 0 ? 0.35 : 1}
            />
          ))}
        </svg>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums sm:justify-start sm:gap-8">
          <span>{points[0]?.label}</span>
          {points.length > 1 ? <span>{points[points.length - 1]?.label}</span> : null}
        </div>
        {isLowData ? (
          <p className="text-[11px] italic text-muted-foreground/90">
            Analytics will become richer as more visitors use the site.
          </p>
        ) : null}
      </div>
    </div>
  )
}
