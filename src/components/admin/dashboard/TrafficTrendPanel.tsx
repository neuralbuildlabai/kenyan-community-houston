import type { TrendPoint } from '@/lib/dashboardHelpers'
import { buildTrendPolyline, trendSeriesMax } from '@/lib/dashboardHelpers'
import { DashboardEmptyState } from '@/components/admin/dashboard/DashboardEmptyState'

const SERIES = [
  { key: 'page_views' as const, label: 'Page views', color: 'hsl(var(--primary))' },
  { key: 'unique_sessions' as const, label: 'Sessions', color: 'hsl(142 45% 35%)' },
  { key: 'clicks' as const, label: 'Clicks', color: 'hsl(38 70% 45%)' },
  { key: 'form_submissions' as const, label: 'Forms', color: 'hsl(210 50% 45%)' },
]

type TrafficTrendPanelProps = {
  points: TrendPoint[]
  loading?: boolean
  periodLabel: string
}

export function TrafficTrendPanel({ points, loading = false, periodLabel }: TrafficTrendPanelProps) {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" aria-label="Loading traffic trend" />
  }

  if (points.length === 0) {
    return (
      <DashboardEmptyState
        title="No traffic data yet"
        description={`Public-site analytics will appear here once visitors browse the community platform during ${periodLabel.toLowerCase()}.`}
      />
    )
  }

  const max = trendSeriesMax(points)
  const width = 640
  const height = 160

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            {s.label}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 w-full min-w-[320px]"
          role="img"
          aria-label={`Traffic and engagement trend for ${periodLabel}`}
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = 4 + (height - 8) * (1 - ratio)
            return (
              <line
                key={ratio}
                x1={4}
                x2={width - 4}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray="4 4"
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
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>{points[0]?.label}</span>
        {points.length > 1 ? <span>{points[points.length - 1]?.label}</span> : null}
      </div>
    </div>
  )
}
