import { cn } from '@/lib/utils'

export type BarDatum = { label: string; value: number; sub?: string }

export function SimpleBars({
  data,
  valueClassName,
}: {
  data: BarDatum[]
  valueClassName?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label} className="space-y-1">
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-muted-foreground truncate">{d.label}</span>
            <span className={cn('font-semibold tabular-nums shrink-0', valueClassName)}>{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-kenyan-gold-500 transition-all"
              style={{ width: `${Math.round((d.value / max) * 100)}%` }}
            />
          </div>
          {d.sub ? <p className="text-[10px] text-muted-foreground">{d.sub}</p> : null}
        </li>
      ))}
    </ul>
  )
}
