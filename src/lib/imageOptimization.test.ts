import { describe, expect, it } from 'vitest'
import { GALLERY_MAX_INPUT_BYTES } from './galleryConstants'
import {
  IMAGE_OPTIMIZATION_MAX_HEIGHT,
  IMAGE_OPTIMIZATION_MAX_WIDTH,
  isHeicFile,
  isLikelyImageFile,
  isSupportedWebImageType,
  scaleDimensions,
  shouldOptimizeImage,
} from './imageOptimization'

describe('imageOptimization helpers', () => {
  it('detects HEIC files by mime and extension', () => {
    expect(isHeicFile(new File([], 'photo.heic', { type: 'image/heic' }))).toBe(true)
    expect(isHeicFile(new File([], 'photo.HEIF', { type: '' }))).toBe(true)
    expect(isHeicFile(new File([], 'photo.jpg', { type: 'image/jpeg' }))).toBe(false)
  })

  it('detects likely image files without mime type', () => {
    expect(isLikelyImageFile(new File([], 'IMG_1169.jpg', { type: '' }))).toBe(true)
    expect(isLikelyImageFile(new File([], 'notes.txt', { type: 'text/plain' }))).toBe(false)
  })

  it('supports common web image types', () => {
    expect(isSupportedWebImageType(new File([], 'a.jpeg', { type: 'image/jpeg' }))).toBe(true)
    expect(isSupportedWebImageType(new File([], 'a.png', { type: 'image/png' }))).toBe(true)
    expect(isSupportedWebImageType(new File([], 'a.webp', { type: 'image/webp' }))).toBe(true)
    expect(isSupportedWebImageType(new File([], 'a.heic', { type: 'image/heic' }))).toBe(false)
  })

  it('scales large DSLR dimensions down without upscaling', () => {
    expect(scaleDimensions(6000, 4000, IMAGE_OPTIMIZATION_MAX_WIDTH, IMAGE_OPTIMIZATION_MAX_HEIGHT)).toEqual({
      width: 2400,
      height: 1600,
    })
    expect(scaleDimensions(1200, 800, IMAGE_OPTIMIZATION_MAX_WIDTH, IMAGE_OPTIMIZATION_MAX_HEIGHT)).toEqual({
      width: 1200,
      height: 800,
    })
  })

  it('requires optimization for large originals even when slightly under 12MB', () => {
    const file = new File([new Uint8Array(GALLERY_MAX_INPUT_BYTES - 1024)], 'big.jpg', {
      type: 'image/jpeg',
    })
    expect(
      shouldOptimizeImage(file, {
        width: 6000,
        height: 4000,
      })
    ).toBe(true)
  })

  it('skips optimization for reasonably sized JPEG originals', () => {
    const file = new File([new Uint8Array(1024 * 1024)], 'small.jpg', { type: 'image/jpeg' })
    expect(
      shouldOptimizeImage(file, {
        width: 2000,
        height: 1333,
      })
    ).toBe(false)
  })

  it('requires optimization when file size exceeds storage limit', () => {
    const file = new File([new Uint8Array(GALLERY_MAX_INPUT_BYTES + 1)], 'large.jpg', {
      type: 'image/jpeg',
    })
    expect(
      shouldOptimizeImage(file, {
        width: 2000,
        height: 1333,
      })
    ).toBe(true)
  })
})
