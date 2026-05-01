import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Houston skyline backdrop with graceful fallback.
 *
 * Tries to load /kigh-media/site/hero/houston-downtown.jpg.
 * If the image is missing or fails to load, falls back to a stylized
 * SVG silhouette layered over the gradient background. This means the
 * site looks intentional even before approved imagery is uploaded.
 *
 * Designed to be placed as `position: absolute inset-0` inside a relatively
 * positioned hero container that already has the green/dark gradient.
 */
export function HoustonSkylineBackdrop({
  className,
  imageSrc = '/kigh-media/site/hero/houston-downtown.jpg',
  alt = '',
}: {
  className?: string
  imageSrc?: string
  alt?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden={!alt}>
      {/* Real photo (lazy, fades in once loaded). Hidden if missing. */}
      {!errored && (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-700',
            loaded ? 'opacity-30 sm:opacity-40' : 'opacity-0',
          )}
          loading="eager"
          decoding="async"
        />
      )}

      {/* SVG skyline silhouette — always rendered behind the photo
          so the hero looks intentional even when the photo is missing. */}
      <svg
        className={cn(
          'absolute inset-x-0 bottom-0 w-full h-44 sm:h-56 lg:h-64 text-white/[0.06]',
          // when a real photo is loaded we soften the silhouette so it doesn't compete
          loaded && !errored ? 'opacity-40' : 'opacity-100',
        )}
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M0 220 L40 220 L40 200 L70 200 L70 230 L120 230 L120 180 L140 180 L140 170 L160 170 L160 220 L200 220 L200 150 L230 150 L230 140 L260 140 L260 200 L300 200 L300 110 L320 110 L320 100 L340 100 L340 90 L360 90 L360 200 L390 200 L390 170 L420 170 L420 130 L450 130 L450 120 L470 120 L470 110 L490 110 L490 200 L520 200 L520 180 L560 180 L560 100 L580 100 L580 90 L600 90 L600 80 L620 80 L620 70 L640 70 L640 200 L670 200 L670 160 L700 160 L700 140 L730 140 L730 200 L760 200 L760 180 L790 180 L790 120 L810 120 L810 110 L830 110 L830 100 L850 100 L850 200 L880 200 L880 170 L910 170 L910 150 L940 150 L940 140 L970 140 L970 130 L990 130 L990 200 L1020 200 L1020 180 L1050 180 L1050 110 L1070 110 L1070 100 L1090 100 L1090 90 L1110 90 L1110 200 L1140 200 L1140 170 L1170 170 L1170 150 L1200 150 L1200 140 L1230 140 L1230 200 L1260 200 L1260 180 L1290 180 L1290 130 L1310 130 L1310 200 L1340 200 L1340 170 L1370 170 L1370 150 L1400 150 L1400 200 L1440 200 L1440 320 L0 320 Z"
        />
      </svg>

      {/* Subtle noise / dot grid for texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Dark-to-green readability overlay (always present) */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/65 to-kenyan-green-900/75" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/70 to-transparent" />
    </div>
  )
}
