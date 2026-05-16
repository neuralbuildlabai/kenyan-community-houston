import { GALLERY_MAX_INPUT_BYTES, GALLERY_THUMB_MAX_WIDTH, GALLERY_WEB_MAX_WIDTH } from '@/lib/galleryConstants'

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
    return await createImageBitmap(file, { resizeWidth: maxWidth })
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

export class GalleryImageProcessingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GalleryImageProcessingError'
  }
}

/**
 * Resize in-browser (strips EXIF via redraw), returns web + thumbnail blobs.
 * Prefer WebP when the browser supports encoding it; otherwise JPEG.
 */
export async function buildGalleryWebAndThumb(file: File): Promise<{ web: Blob; thumb: Blob; mime: 'image/webp' | 'image/jpeg' }> {
  if (!file.type.startsWith('image/')) {
    throw new GalleryImageProcessingError('Please choose an image file (JPEG, PNG, or WebP).')
  }
  if (file.size > GALLERY_MAX_INPUT_BYTES) {
    throw new GalleryImageProcessingError(
      `Each image must be under ${Math.round(GALLERY_MAX_INPUT_BYTES / (1024 * 1024))} MB after selection. Try a smaller photo.`
    )
  }

  const mime: 'image/webp' | 'image/jpeg' = canEncodeWebp() ? 'image/webp' : 'image/jpeg'

  const webBmp = await bitmapFromFile(file, GALLERY_WEB_MAX_WIDTH)
  const thumbBmp = await bitmapFromFile(file, GALLERY_THUMB_MAX_WIDTH)

  const web = await bitmapToBlob(webBmp, mime, mime === 'image/webp' ? 0.82 : 0.88)
  const thumb = await bitmapToBlob(thumbBmp, mime, mime === 'image/webp' ? 0.8 : 0.85)

  if (web.size > GALLERY_MAX_INPUT_BYTES || thumb.size > GALLERY_MAX_INPUT_BYTES) {
    throw new GalleryImageProcessingError('Compressed image is still too large. Try a smaller original.')
  }

  return { web, thumb, mime }
}
