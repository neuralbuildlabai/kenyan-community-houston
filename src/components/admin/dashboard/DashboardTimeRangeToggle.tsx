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
      className={cn(
        'inline-flex flex-wrap gap-0.5 rounded-xl border border-slate-200/60 bg-white/80 p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm',
        className
      )}
    >
      {PERIODS.map(({ value: period, label }) => (
        <Button
          key={period}
          type="button"
          size="sm"
          variant={value === period ? 'default' : 'ghost'}
          className={cn(
            'h-8 rounded-lg px-3 text-xs font-medium',
            value !== period && 'text-muted-foreground hover:bg-slate-50 hover:text-foreground'
          )}
          aria-pressed={value === period}
          onClick={() => onChange(period)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
