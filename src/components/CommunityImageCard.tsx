import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Community image card with graceful fallback.
 *
 * Reads from /kigh-media/site/community/* (see public/kigh-media/site/README.md).
 * If the image is missing or fails to load, renders a tasteful gradient panel
 * with an icon + caption so the page still looks intentional.
 */
export function CommunityImageCard({
  src,
  alt,
  caption,
  Icon,
  className,
  aspect = 'aspect-[4/3]',
}: {
  src: string
  alt: string
  caption?: string
  Icon?: LucideIcon
  className?: string
  aspect?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const showFallback = errored

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 via-primary/5 to-kenyan-gold-500/10 shadow-sm',
        aspect,
        className,
      )}
    >
      {!showFallback && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          loading="lazy"
          decoding="async"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}

      {/* Fallback content — visible when image fails or is missing */}
      {showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
          {Icon ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-primary shadow-sm mb-3">
              <Icon className="h-6 w-6" />
            </div>
          ) : null}
          <p className="text-sm font-medium text-primary/90 max-w-xs leading-snug">
            {caption ?? 'Community moment'}
          </p>
        </div>
      )}

      {/* Soft caption overlay when an image successfully loads */}
      {loaded && !errored && caption ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-transparent p-4">
          <p className="text-xs sm:text-sm font-medium text-white/95 leading-snug">{caption}</p>
        </div>
      ) : null}
    </div>
  )
}
