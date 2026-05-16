import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PublicSectionProps = {
  id?: string
  title?: string
  description?: string
  /** Visually de-emphasize the section heading (e.g. legal blocks). */
  titleMuted?: boolean
  children: ReactNode
  className?: string
  /** Inner content width: default matches `public-container`. */
  contentClassName?: string
}

/**
 * Standard vertical rhythm for public interior sections (Pass 1 foundation).
 */
export function PublicSection({
  id,
  title,
  description,
  titleMuted,
  children,
  className,
  contentClassName,
}: PublicSectionProps) {
  return (
    <section id={id} className={cn('py-12 sm:py-16 lg:py-20', className)}>
      <div className={cn('public-container', contentClassName)}>
        {title ? (
          <header className={cn('mb-10 max-w-3xl', titleMuted && 'opacity-90')}>
            <h2
              className={cn(
                'text-2xl font-semibold tracking-tight text-foreground sm:text-3xl',
                titleMuted && 'text-lg sm:text-xl text-muted-foreground'
              )}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </header>
        ) : null}
        {children}
      </div>
    </section>
  )
}
