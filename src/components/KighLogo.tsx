import { cn } from '@/lib/utils'
import { KIGH_LOGO_ALT, KIGH_LOGO_PATH } from '@/lib/kighAssets'

type KighLogoProps = {
  className?: string
  imgClassName?: string
  /** Outer wrapper, e.g. rounded card around logo */
  withCard?: boolean
}

export function KighLogo({ className, imgClassName, withCard }: KighLogoProps) {
  const inner = (
    <img
      src={KIGH_LOGO_PATH}
      alt={KIGH_LOGO_ALT}
      className={cn('h-full w-full max-h-full object-contain', imgClassName)}
      loading="lazy"
      decoding="async"
    />
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
