import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 4000

export type GallerySlideshowImage = {
  id: string
}

type GallerySlideshowLightboxProps<T extends GallerySlideshowImage> = {
  images: T[]
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  getImageSrc: (image: T) => string
  getAlt: (image: T) => string
  getCaption?: (image: T) => string | null | undefined
  autoplayMs?: number
}

export function GallerySlideshowLightbox<T extends GallerySlideshowImage>({
  images,
  initialIndex,
  open,
  onOpenChange,
  getImageSrc,
  getAlt,
  getCaption,
  autoplayMs = AUTOPLAY_MS,
}: GallerySlideshowLightboxProps<T>) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isUserHolding, setIsUserHolding] = useState(false)

  const count = images.length
  const current = count > 0 ? images[activeIndex] : undefined
  const src = current ? getImageSrc(current) : ''
  const caption = current && getCaption ? getCaption(current) : null

  const goNext = useCallback(() => {
    if (count <= 1) return
    setActiveIndex((i) => (i + 1) % count)
  }, [count])

  const goPrev = useCallback(() => {
    if (count <= 1) return
    setActiveIndex((i) => (i - 1 + count) % count)
  }, [count])

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  useEffect(() => {
    if (!open) return
    const safeIndex = Math.min(Math.max(0, initialIndex), Math.max(0, count - 1))
    setActiveIndex(safeIndex)
    setIsPlaying(true)
    setIsUserHolding(false)
  }, [open, initialIndex, count])

  useEffect(() => {
    if (!open || !isPlaying || isUserHolding || count <= 1) return
    const id = window.setInterval(goNext, autoplayMs)
    return () => window.clearInterval(id)
  }, [open, isPlaying, isUserHolding, count, autoplayMs, goNext])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
        return
      }
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        setIsPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close, goNext, goPrev])

  if (!open || !current || !src) return null

  const pauseProps = {
    onMouseEnter: () => setIsUserHolding(true),
    onMouseLeave: () => setIsUserHolding(false),
    onPointerDown: () => setIsUserHolding(true),
    onPointerUp: () => setIsUserHolding(false),
    onPointerCancel: () => setIsUserHolding(false),
    onTouchStart: () => setIsUserHolding(true),
    onTouchEnd: () => setIsUserHolding(false),
    onFocus: () => setIsUserHolding(true),
    onBlur: () => setIsUserHolding(false),
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gallery slideshow"
      data-testid="gallery-lightbox"
      className="fixed inset-0 z-50 flex touch-none flex-col bg-black/90"
      onClick={close}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-sm font-medium tabular-nums text-white/90"
          data-testid="gallery-lightbox-counter"
        >
          {activeIndex + 1} / {count}
        </p>
        <div className="flex items-center gap-2">
          {count > 1 ? (
            <button
              type="button"
              data-testid="gallery-lightbox-play-pause"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              onClick={() => setIsPlaying((p) => !p)}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          ) : null}
          <button
              type="button"
              data-testid="gallery-lightbox-close"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Close slideshow"
              onClick={close}
            >
              <X className="h-6 w-6" />
            </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-12">
        {count > 1 ? (
          <button
            type="button"
            data-testid="gallery-lightbox-prev"
            className={cn(
              'absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white sm:left-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
            )}
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        ) : null}

        <div
          className="flex max-h-full w-full max-w-[min(100%,72rem)] flex-col items-center justify-center px-12 sm:px-16"
          onClick={(e) => e.stopPropagation()}
          {...pauseProps}
        >
          <img
            key={current.id}
            src={src}
            alt={getAlt(current)}
            data-testid="gallery-lightbox-image"
            className="max-h-[80vh] w-full rounded-xl object-contain"
            loading="eager"
            draggable={false}
          />
        </div>

        {count > 1 ? (
          <button
            type="button"
            data-testid="gallery-lightbox-next"
            className={cn(
              'absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white sm:right-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
            )}
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        ) : null}
      </div>

      {caption ? (
        <p
          className="shrink-0 px-4 pb-5 pt-2 text-center text-sm text-white/85 sm:px-8"
          data-testid="gallery-lightbox-caption"
          onClick={(e) => e.stopPropagation()}
        >
          {caption}
        </p>
      ) : null}
    </div>
  )
}
