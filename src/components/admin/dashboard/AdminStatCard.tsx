import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type AdminStatCardProps = {
  label: string
  value: number
  sublabel?: string
  href?: string
  icon: LucideIcon
  loading?: boolean
  accent?: 'default' | 'warning'
}

export function AdminStatCard({
  label,
  value,
  sublabel,
  href,
  icon: Icon,
  loading = false,
  accent = 'default',
}: AdminStatCardProps) {
  const content = (
    <div
      className={cn(
        'h-full rounded-xl border bg-white p-5 transition-colors',
        accent === 'warning' && value > 0
          ? 'border-amber-200/80 hover:border-amber-300'
          : 'border-border/70 hover:border-primary/30',
        href && 'hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" aria-hidden />
          ) : (
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">{value}</p>
          )}
          {sublabel && !loading ? (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{sublabel}</p>
          ) : null}
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            accent === 'warning' && value > 0 ? 'bg-amber-100 text-amber-800' : 'bg-primary/10 text-primary'
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link to={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
        {content}
      </Link>
    )
  }

  return content
}
