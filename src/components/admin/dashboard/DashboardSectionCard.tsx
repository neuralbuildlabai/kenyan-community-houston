import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DashboardSectionCardProps = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  id?: string
  className?: string
  variant?: 'default' | 'analytics' | 'operational' | 'attention' | 'system'
  children: ReactNode
}

const variantStyles: Record<NonNullable<DashboardSectionCardProps['variant']>, string> = {
  default: 'border-slate-200/50 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  analytics: 'border-teal-200/40 bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/30 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  operational: 'border-slate-200/40 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
  attention: 'border-amber-200/30 bg-gradient-to-br from-amber-50/30 via-white to-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  system: 'border-slate-300/40 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/40 shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
}

const headerBorderStyles: Record<NonNullable<DashboardSectionCardProps['variant']>, string> = {
  default: 'border-slate-100/80',
  analytics: 'border-teal-100/60',
  operational: 'border-slate-100/70',
  attention: 'border-amber-100/50',
  system: 'border-slate-200/50',
}

export function DashboardSectionCard({
  title,
  description,
  icon,
  action,
  id,
  className,
  variant = 'default',
  children,
}: DashboardSectionCardProps) {
  return (
    <section
      id={id}
      className={cn('scroll-mt-6 overflow-hidden rounded-2xl border', variantStyles[variant], className)}
    >
      <div
        className={cn(
          'flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
          headerBorderStyles[variant]
        )}
      >
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-foreground">
            {icon}
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
