import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type DashboardSectionCardProps = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}

export function DashboardSectionCard({
  title,
  description,
  icon,
  action,
  id,
  className,
  children,
}: DashboardSectionCardProps) {
  return (
    <section
      id={id}
      className={cn('scroll-mt-6 rounded-xl border border-border/70 bg-white', className)}
    >
      <div className="flex flex-col gap-2 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            {icon}
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
