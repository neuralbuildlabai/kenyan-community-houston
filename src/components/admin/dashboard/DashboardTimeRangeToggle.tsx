import { Button } from '@/components/ui/button'
import type { DashboardAnalyticsPeriod } from '@/lib/adminDashboardApi'
import { cn } from '@/lib/utils'

const PERIODS: { value: DashboardAnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'monthly', label: 'Monthly' },
]

type DashboardTimeRangeToggleProps = {
  value: DashboardAnalyticsPeriod
  onChange: (period: DashboardAnalyticsPeriod) => void
  className?: string
}

export function DashboardTimeRangeToggle({ value, onChange, className }: DashboardTimeRangeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Analytics time range"
      className={cn('inline-flex flex-wrap gap-1 rounded-lg border border-border/70 bg-muted/30 p-1', className)}
    >
      {PERIODS.map(({ value: period, label }) => (
        <Button
          key={period}
          type="button"
          size="sm"
          variant={value === period ? 'default' : 'ghost'}
          className={cn('h-8 px-3 text-xs', value !== period && 'text-muted-foreground')}
          aria-pressed={value === period}
          onClick={() => onChange(period)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
