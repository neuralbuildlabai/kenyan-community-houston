import { cn } from '@/lib/utils'
import { KIGH_LOGO_ALT, KIGH_LOGO_UI } from '@/lib/kighAssets'

type KighLogoProps = {
  className?: string
  imgClassName?: string
  /** Outer wrapper, e.g. rounded card around logo */
  withCard?: boolean
}

export function KighLogo({ className, imgClassName, withCard }: KighLogoProps) {
  const inner = (
    // Not lazy: the logo is in the header on every page and is only a few KB,
    // and lazy images inside <picture> did not start loading in Chromium testing.
    <picture className="flex h-full w-full items-center justify-center">
      <source type="image/webp" srcSet={KIGH_LOGO_UI.webpSrcSet} sizes="96px" />
      <img
        src={KIGH_LOGO_UI.fallback}
        alt={KIGH_LOGO_ALT}
        width={KIGH_LOGO_UI.size}
        height={KIGH_LOGO_UI.size}
        className={cn('h-full w-full max-h-full object-contain', imgClassName)}
        decoding="async"
      />
    </picture>
  )
  if (withCard) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white p-1 shadow-sm',
          className
        )}
      >
        {inner}
      </div>
    )
  }
  return (
    <div className={cn('flex shrink-0 items-center justify-center', className)}>
      {inner}
    </div>
  )
}
