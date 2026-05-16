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
  /**
   * Subtle page identity wash. Pass 3 introduces page-specific accents while
   * keeping the overall design language cohesive. Picks the right combination
   * of background gradient, border tint, and eyebrow color for each surface.
   */
  tone?:
    | 'default'
    | 'muted'
    | 'tint'
    | 'navy'
    | 'sage'
    | 'amber'
    | 'cream'
    | 'gold'
    | 'forest'
  className?: string
  /**
   * Optional rich subtitle slot — overrides `subtitle` when provided.
   * Useful for warmer multi-paragraph intros without losing the H1 styling.
   */
  richSubtitle?: ReactNode
}

const toneClass: Record<NonNullable<PublicPageHeroProps['tone']>, string> = {
  default: 'border-b border-border/50 bg-gradient-to-b from-card to-background',
  muted: 'border-b border-border/40 bg-muted/25',
  tint: 'border-b border-primary/10 bg-gradient-to-br from-primary/[0.06] via-background to-kenyan-gold-500/[0.04]',
  // Governance: navy + gold + cream — serious, official, transparent.
  navy: 'border-b border-slate-900/15 bg-gradient-to-br from-slate-900/[0.06] via-background to-kenyan-gold-500/[0.06]',
  // Community Groups: sage green + clay/copper — institutional warmth.
  sage: 'border-b border-emerald-900/10 bg-gradient-to-br from-emerald-900/[0.05] via-background to-amber-800/[0.04]',
  // Community Support: muted green + warm amber — care, not donation-first.
  amber: 'border-b border-amber-700/15 bg-gradient-to-br from-primary/[0.04] via-background to-amber-500/[0.07]',
  // Gallery / soft editorial: warm cream + soft copper.
  cream: 'border-b border-amber-300/20 bg-gradient-to-br from-amber-50/60 via-background to-amber-100/40 dark:from-amber-950/15 dark:to-amber-900/10',
  // Sports & Youth: fresh green + energetic gold.
  gold: 'border-b border-kenyan-gold-500/15 bg-gradient-to-br from-emerald-700/[0.05] via-background to-kenyan-gold-500/[0.08]',
  // Business Directory: forest green + warm sand.
  forest: 'border-b border-emerald-900/15 bg-gradient-to-br from-emerald-900/[0.06] via-background to-amber-200/[0.18] dark:to-amber-900/10',
}

const eyebrowToneClass: Record<NonNullable<PublicPageHeroProps['tone']>, string> = {
  default: 'text-muted-foreground',
  muted: 'text-muted-foreground',
  tint: 'text-primary/80',
  navy: 'text-slate-700 dark:text-slate-300',
  sage: 'text-emerald-800/85 dark:text-emerald-300/85',
  amber: 'text-amber-800/85 dark:text-amber-300/85',
  cream: 'text-amber-900/80 dark:text-amber-200/80',
  gold: 'text-kenyan-gold-700 dark:text-kenyan-gold-400',
  forest: 'text-emerald-900/85 dark:text-emerald-300/85',
}

/**
 * Reusable public page header for Pass 2 interior routes (Events, Membership, etc.).
 * Pass 1 introduces the component; most pages adopt it in Pass 2.
 */
export function PublicPageHero({
  eyebrow,
  title,
  subtitle,
  richSubtitle,
  primaryAction,
  secondaryAction,
  compact,
  tone = 'default',
  className,
}: PublicPageHeroProps) {
  return (
    <section
      data-public-hero
      data-tone={tone}
      className={cn(
        toneClass[tone],
        compact ? 'py-10 sm:py-12' : 'py-12 sm:py-16 lg:py-20',
        className
      )}
    >
      <div className="public-container">
        {eyebrow ? (
          <p
            className={cn(
              'mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] sm:text-xs',
              eyebrowToneClass[tone]
            )}
          >
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
        {richSubtitle ? (
          <div
            className={cn(
              'mt-4 max-w-3xl text-muted-foreground leading-relaxed',
              compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
            )}
          >
            {richSubtitle}
          </div>
        ) : subtitle ? (
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
