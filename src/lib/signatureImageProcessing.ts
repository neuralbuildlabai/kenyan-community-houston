/** Near-white pixels above this RGB value become transparent (handles JPEG scan backgrounds). */
const WHITE_THRESHOLD = 238

/** Padding around cropped ink bounds in pixels. */
const CROP_PADDING_PX = 4

const processedUrlCache = new Map<string, string>()

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load signature image'))
    img.src = src
  })
}

function isNearWhite(r: number, g: number, b: number, a: number, threshold: number): boolean {
  if (a < 8) return true
  return r >= threshold && g >= threshold && b >= threshold
}

/** Remove near-white background pixels; preserve dark ink strokes. */
export function removeWhiteBackgroundFromImageData(
  imageData: ImageData,
  threshold = WHITE_THRESHOLD
): ImageData {
  const { data } = imageData
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (isNearWhite(r, g, b, a, threshold)) {
      data[i + 3] = 0
      continue
    }
    // Soften light gray halos around ink from JPEG compression.
    const minChannel = Math.min(r, g, b)
    if (minChannel >= threshold - 18) {
      const fade = Math.max(0, 255 - minChannel) / 18
      data[i + 3] = Math.round(a * fade)
    }
  }
  return imageData
}

type CropBounds = { x: number; y: number; width: number; height: number }

/** Find tight bounds around non-transparent ink pixels. */
export function findInkBounds(imageData: ImageData, padding = CROP_PADDING_PX): CropBounds | null {
  const { width, height, data } = imageData
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let found = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 12) {
        found = true
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (!found) return null

  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width - 1, maxX + padding)
  maxY = Math.min(height - 1, maxY + padding)

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

/** Process a loaded image into a transparent PNG data URL suitable for certificate ink rendering. */
export async function processSignatureImageElement(
  img: HTMLImageElement,
  threshold = WHITE_THRESHOLD
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return img.src

  ctx.drawImage(img, 0, 0)
  const full = ctx.getImageData(0, 0, canvas.width, canvas.height)
  removeWhiteBackgroundFromImageData(full, threshold)

  const bounds = findInkBounds(full)
  if (!bounds) {
    return canvas.toDataURL('image/png')
  }

  const cropped = ctx.createImageData(bounds.width, bounds.height)
  for (let y = 0; y < bounds.height; y++) {
    for (let x = 0; x < bounds.width; x++) {
      const srcIdx = ((bounds.y + y) * full.width + (bounds.x + x)) * 4
      const dstIdx = (y * bounds.width + x) * 4
      cropped.data[dstIdx] = full.data[srcIdx]
      cropped.data[dstIdx + 1] = full.data[srcIdx + 1]
      cropped.data[dstIdx + 2] = full.data[srcIdx + 2]
      cropped.data[dstIdx + 3] = full.data[srcIdx + 3]
    }
  }

  canvas.width = bounds.width
  canvas.height = bounds.height
  ctx.putImageData(cropped, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Prepare a signature image URL for display: strip near-white backgrounds and crop whitespace.
 * Results are cached per source URL for the session.
 */
export async function prepareSignatureImageForDisplay(src: string): Promise<string> {
  if (!src) return src
  const cached = processedUrlCache.get(src)
  if (cached) return cached

  // Already a processed inline PNG from a prior pass.
  if (src.startsWith('data:image/png')) {
    processedUrlCache.set(src, src)
    return src
  }

  try {
    const img = await loadImage(src)
    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return src
    const processed = await processSignatureImageElement(img)
    processedUrlCache.set(src, processed)
    return processed
  } catch {
    return src
  }
}

/** Ensure all certificate signature images inside a DOM root use processed transparent PNGs. */
export async function prepareSignatureImagesInRoot(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('.cert-signature-image'))
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src') || img.src
      if (!src) return
      try {
        const processed = await prepareSignatureImageForDisplay(src)
        if (processed === src) return
        await new Promise<void>((resolve) => {
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          img.src = processed
        })
      } catch {
        // Keep original src; CSS blend mode remains as fallback.
      }
    })
  )
}
