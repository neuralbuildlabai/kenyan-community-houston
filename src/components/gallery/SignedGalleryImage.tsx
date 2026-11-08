import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GalleryImageState } from '@/lib/galleryImageUrls'

type SignedGalleryImageProps = {
  image: GalleryImageState
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
}

/**
 * A gallery photo behind a signed URL: the image once signed, a quiet
 * placeholder while signing, and a "not available" tile when signing is
 * refused or fails. Never falls back to the stored public URL.
 */
export function SignedGalleryImage({ image, alt, className, loading = 'lazy' }: SignedGalleryImageProps) {
  if (image.state === 'ready') {
    return <img src={image.url} alt={alt} loading={loading} decoding="async" className={className} />
  }
  if (image.state === 'pending') {
    return <div role="img" aria-label={alt} aria-busy="true" className={cn('animate-pulse bg-muted', className)} />
  }
  // Storage answers "not found" both for a missing file and for one this
  // viewer may not read, so the placeholder does not claim which it is.
  return (
    <div
      role="img"
      aria-label="Photo not available"
      data-testid="gallery-image-unavailable"
      className={cn('flex items-center justify-center bg-muted text-muted-foreground', className)}
    >
      <ImageOff className="h-5 w-5" aria-hidden />
    </div>
  )
}
