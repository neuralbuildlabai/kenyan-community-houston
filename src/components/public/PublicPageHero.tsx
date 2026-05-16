import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PublicPageHeroProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  /** Tighter vertical rhythm for dense admin-adjacent pages (Pass 2). */
  compact?: boolean
  /** Default: white/muted band; muted = softer; tint = light green wash. */
  tone?: 'default' | 'muted' | 'tint'
  className?: string
}

const toneClass: Record<NonNullable<PublicPageHeroProps['tone']>, string> = {
  default: 'border-b border-border/50 bg-gradient-to-b from-card to-background',
  muted: 'border-b border-border/40 bg-muted/25',
  tint: 'border-b border-primary/10 bg-gradient-to-br from-primary/[0.06] via-background to-kenyan-gold-500/[0.04]',
}

/**
 * Reusable public page header for Pass 2 interior routes (Events, Membership, etc.).
 * Pass 1 introduces the component; most pages adopt it in Pass 2.
 */
export function PublicPageHero({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  compact,
  tone = 'default',
  className,
}: PublicPageHeroProps) {
  return (
    <section
      className={cn(
        toneClass[tone],
        compact ? 'py-10 sm:py-12' : 'py-12 sm:py-16 lg:py-20',
        className
      )}
    >
      <div className="public-container">
        {eyebrow ? (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            'font-semibold tracking-tight text-foreground',
            compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl lg:text-[2.5rem]'
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={cn(
              'mt-4 max-w-3xl text-muted-foreground leading-relaxed',
              compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
            )}
          >
            {subtitle}
          </p>
        ) : null}
        {primaryAction || secondaryAction ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {primaryAction}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </section>
  )
}
