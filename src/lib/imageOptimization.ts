import { GALLERY_MAX_INPUT_BYTES } from '@/lib/galleryConstants'

export const IMAGE_OPTIMIZATION_MAX_WIDTH = 2400
export const IMAGE_OPTIMIZATION_MAX_HEIGHT = 2400
/** Prefer outputs under this size when quality allows. */
export const IMAGE_OPTIMIZATION_TARGET_BYTES = 6 * 1024 * 1024
export const IMAGE_OPTIMIZATION_QUALITY_STEPS = [0.88, 0.85, 0.82, 0.78, 0.74] as const

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
const HEIC_EXTENSIONS = new Set(['heic', 'heif'])
const LIKELY_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'])

export class ImageOptimizationError extends Error {
  readonly code: 'unsupported' | 'decode_failed' | 'too_large'

  constructor(message: string, code: 'unsupported' | 'decode_failed' | 'too_large') {
    super(message)
    this.name = 'ImageOptimizationError'
    this.code = code
  }
}

export interface OptimizeImageResult {
  file: File
  wasOptimized: boolean
  originalSize: number
  outputSize: number
  width: number
  height: number
}

export interface ImageDimensions {
  width: number
  height: number
}

function normalizeMime(type: string): string {
  return type.toLowerCase().trim()
}

function fileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? '') : ''
}

export function isHeicFile(file: File): boolean {
  const mime = normalizeMime(file.type)
  if (mime === 'image/heic' || mime === 'image/heif') return true
  return HEIC_EXTENSIONS.has(fileExtension(file.name))
}

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return LIKELY_IMAGE_EXTENSIONS.has(fileExtension(file.name))
}

export function isSupportedWebImageType(file: File): boolean {
  const mime = normalizeMime(file.type)
  if (SUPPORTED_MIME_TYPES.has(mime)) return true
  const ext = fileExtension(file.name)
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp'
}

export function scaleDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): ImageDimensions {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

export function shouldOptimizeImage(file: File, dimensions: ImageDimensions): boolean {
  if (file.size > GALLERY_MAX_INPUT_BYTES) return true
  return (
    dimensions.width > IMAGE_OPTIMIZATION_MAX_WIDTH ||
    dimensions.height > IMAGE_OPTIMIZATION_MAX_HEIGHT
  )
}

async function loadImageDimensions(file: File): Promise<ImageDimensions> {
  try {
    const bitmap = await createImageBitmap(file)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dimensions
  } catch {
    const url = URL.createObjectURL(file)
    try {
      return await new Promise<ImageDimensions>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () =>
          reject(new ImageOptimizationError(`Could not decode ${file.name}.`, 'decode_failed'))
        img.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

async function drawFileToCanvas(
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<HTMLCanvasElement> {
  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: targetWidth,
      resizeHeight: targetHeight,
      resizeQuality: 'high',
    })
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      throw new ImageOptimizationError('Canvas is not supported in this browser.', 'decode_failed')
    }
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    return canvas
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () =>
          reject(new ImageOptimizationError(`Could not decode ${file.name}.`, 'decode_failed'))
        el.src = url
      })
      const scaled = scaleDimensions(
        img.naturalWidth,
        img.naturalHeight,
        targetWidth,
        targetHeight
      )
      const canvas = document.createElement('canvas')
      canvas.width = scaled.width
      canvas.height = scaled.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new ImageOptimizationError('Canvas is not supported in this browser.', 'decode_failed')
      }
      ctx.drawImage(img, 0, 0, scaled.width, scaled.height)
      return canvas
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )
  if (!blob) {
    throw new ImageOptimizationError('Image encoding failed.', 'decode_failed')
  }
  return blob
}

function optimizedFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image'
  return `${base}.jpg`
}

/**
 * Prepare a browser-uploadable image file from a large DSLR/event photo.
 * Large originals are resized and re-encoded as JPEG with metadata stripped.
 */
export async function optimizeImageFile(file: File): Promise<OptimizeImageResult> {
  const originalSize = file.size

  if (!isLikelyImageFile(file)) {
    throw new ImageOptimizationError(
      `${file.name} is an unsupported image type. Use JPEG, PNG, or WebP.`,
      'unsupported'
    )
  }

  if (isHeicFile(file)) {
    throw new ImageOptimizationError(
      `${file.name} is HEIC/HEIF, which is not supported in this browser. Please convert to JPEG first.`,
      'unsupported'
    )
  }

  if (!isSupportedWebImageType(file)) {
    throw new ImageOptimizationError(
      `${file.name} is an unsupported image type. Use JPEG, PNG, or WebP.`,
      'unsupported'
    )
  }

  const dimensions = await loadImageDimensions(file)

  if (!shouldOptimizeImage(file, dimensions)) {
    return {
      file,
      wasOptimized: false,
      originalSize,
      outputSize: file.size,
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  const scaled = scaleDimensions(
    dimensions.width,
    dimensions.height,
    IMAGE_OPTIMIZATION_MAX_WIDTH,
    IMAGE_OPTIMIZATION_MAX_HEIGHT
  )
  const canvas = await drawFileToCanvas(file, scaled.width, scaled.height)

  let outputBlob: Blob | null = null
  for (const quality of IMAGE_OPTIMIZATION_QUALITY_STEPS) {
    const blob = await canvasToJpegBlob(canvas, quality)
    outputBlob = blob
    if (blob.size <= GALLERY_MAX_INPUT_BYTES) {
      if (blob.size <= IMAGE_OPTIMIZATION_TARGET_BYTES) break
      break
    }
  }

  if (!outputBlob || outputBlob.size > GALLERY_MAX_INPUT_BYTES) {
    throw new ImageOptimizationError(
      `${file.name} could not be optimized below ${Math.round(GALLERY_MAX_INPUT_BYTES / (1024 * 1024))} MB.`,
      'too_large'
    )
  }

  const optimized = new File([outputBlob], optimizedFileName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })

  return {
    file: optimized,
    wasOptimized: true,
    originalSize,
    outputSize: optimized.size,
    width: scaled.width,
    height: scaled.height,
  }
}
