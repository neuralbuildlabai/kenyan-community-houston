import {
  GALLERY_MAX_INPUT_BYTES,
  GALLERY_THUMB_MAX_WIDTH,
  GALLERY_WEB_MAX_WIDTH,
} from '@/lib/galleryConstants'
import {
  ImageOptimizationError,
  isLikelyImageFile,
  optimizeImageFile,
} from '@/lib/imageOptimization'

function canEncodeWebp(): boolean {
  try {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    const d = c.toDataURL('image/webp')
    return d.startsWith('data:image/webp')
  } catch {
    return false
  }
}

async function bitmapFromFile(file: File, maxWidth: number): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { resizeWidth: maxWidth, resizeQuality: 'high' })
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('Could not decode image'))
        el.src = url
      })
      const w = img.naturalWidth
      const h = img.naturalHeight
      const scale = w > maxWidth ? maxWidth / w : 1
      const tw = Math.max(1, Math.round(w * scale))
      const th = Math.max(1, Math.round(h * scale))
      const c = document.createElement('canvas')
      c.width = tw
      c.height = th
      const ctx = c.getContext('2d')
      if (!ctx) throw new Error('Canvas unsupported')
      ctx.drawImage(img, 0, 0, tw, th)
      return await createImageBitmap(c)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

async function bitmapToBlob(bitmap: ImageBitmap, mime: 'image/webp' | 'image/jpeg', quality: number): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = bitmap.width
  c.height = bitmap.height
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas unsupported')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, mime, quality))
  if (!blob) throw new Error('Image encoding failed')
  return blob
}

async function encodeWithQualitySteps(
  file: File,
  maxWidth: number,
  mime: 'image/webp' | 'image/jpeg',
  qualities: number[]
): Promise<Blob> {
  let lastBlob: Blob | null = null
  for (const quality of qualities) {
    const bitmap = await bitmapFromFile(file, maxWidth)
    const blob = await bitmapToBlob(bitmap, mime, quality)
    lastBlob = blob
    if (blob.size <= GALLERY_MAX_INPUT_BYTES) return blob
  }
  if (lastBlob) return lastBlob
  throw new Error('Image encoding failed')
}

export class GalleryImageProcessingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GalleryImageProcessingError'
  }
}

export interface GalleryProcessedImage {
  web: Blob
  thumb: Blob
  mime: 'image/webp' | 'image/jpeg'
  wasOptimized: boolean
}

/**
 * Optimize large originals when needed, then return web + thumbnail blobs.
 * Prefer WebP when the browser supports encoding it; otherwise JPEG.
 */
export async function buildGalleryWebAndThumb(file: File): Promise<GalleryProcessedImage> {
  if (!isLikelyImageFile(file)) {
    throw new GalleryImageProcessingError('Please choose an image file (JPEG, PNG, or WebP).')
  }

  let sourceFile = file
  let wasOptimized = false
  try {
    const optimized = await optimizeImageFile(file)
    sourceFile = optimized.file
    wasOptimized = optimized.wasOptimized
  } catch (err) {
    if (err instanceof ImageOptimizationError) {
      throw new GalleryImageProcessingError(err.message)
    }
    throw err
  }

  const mime: 'image/webp' | 'image/jpeg' = canEncodeWebp() ? 'image/webp' : 'image/jpeg'
  const webQualities = mime === 'image/webp' ? [0.82, 0.78, 0.74] : [0.88, 0.85, 0.82, 0.78]
  const thumbQualities = mime === 'image/webp' ? [0.82, 0.78] : [0.85, 0.82, 0.78]

  const web = await encodeWithQualitySteps(sourceFile, GALLERY_WEB_MAX_WIDTH, mime, webQualities)
  const thumb = await encodeWithQualitySteps(sourceFile, GALLERY_THUMB_MAX_WIDTH, mime, thumbQualities)

  if (web.size > GALLERY_MAX_INPUT_BYTES || thumb.size > GALLERY_MAX_INPUT_BYTES) {
    throw new GalleryImageProcessingError(`${file.name} could not be optimized below 12 MB.`)
  }

  return { web, thumb, mime, wasOptimized }
}
