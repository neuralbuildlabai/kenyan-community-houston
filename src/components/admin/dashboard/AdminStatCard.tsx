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
  layout?: 'card' | 'strip' | 'compact'
}

export function AdminStatCard({
  label,
  value,
  sublabel,
  href,
  icon: Icon,
  loading = false,
  accent = 'default',
  layout = 'card',
}: AdminStatCardProps) {
  const isAttention = accent === 'warning' && value > 0

  const content = (
    <div
      className={cn(
        'h-full transition-colors',
        layout === 'card' && [
          'rounded-xl border bg-white p-5',
          isAttention ? 'border-amber-200/60 bg-amber-50/20' : 'border-slate-200/50 hover:border-primary/20',
          href && 'hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
        ],
        layout === 'strip' && [
          'px-4 py-4 sm:px-5 sm:py-5',
          isAttention && 'bg-amber-50/30',
          href && 'hover:bg-kenyan-green-50/40',
        ],
        layout === 'compact' && [
          'px-3 py-3 sm:px-4',
          isAttention && 'bg-amber-50/25',
          href && 'hover:bg-slate-50/80',
        ]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-medium text-muted-foreground',
              layout === 'compact' ? 'text-[11px] leading-tight' : 'text-xs tracking-wide'
            )}
          >
            {label}
          </p>
          {loading ? (
            <div
              className={cn('animate-pulse rounded bg-muted', layout === 'compact' ? 'mt-1.5 h-6 w-12' : 'mt-2 h-8 w-16')}
              aria-hidden
            />
          ) : (
            <p
              className={cn(
                'font-semibold tabular-nums tracking-tight text-foreground',
                layout === 'compact' ? 'mt-1 text-xl' : 'mt-1.5 text-2xl sm:text-[1.65rem]'
              )}
            >
              {value}
            </p>
          )}
          {sublabel && !loading ? (
            <p
              className={cn(
                'leading-snug text-muted-foreground',
                layout === 'compact' ? 'mt-1 text-[10px]' : 'mt-1.5 text-xs'
              )}
            >
              {sublabel}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full',
            layout === 'compact' ? 'h-8 w-8' : 'h-10 w-10',
            isAttention ? 'bg-amber-100/80 text-amber-800' : 'bg-kenyan-green-100/70 text-kenyan-green-800'
          )}
        >
          <Icon className={cn(layout === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        to={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    )
  }

  return content
}
