import { describe, expect, it } from 'vitest'
import {
  findInkBounds,
  removeWhiteBackgroundFromImageData,
} from '@/lib/signatureImageProcessing'

function makeImageData(width: number, height: number, fill: [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]
    data[i + 1] = fill[1]
    data[i + 2] = fill[2]
    data[i + 3] = fill[3]
  }
  return { width, height, data } as ImageData
}

describe('removeWhiteBackgroundFromImageData', () => {
  it('makes near-white pixels transparent', () => {
    const imageData = makeImageData(2, 2, [255, 255, 255, 255])
    removeWhiteBackgroundFromImageData(imageData)
    expect(imageData.data[3]).toBe(0)
    expect(imageData.data[7]).toBe(0)
  })

  it('preserves dark ink pixels', () => {
    const imageData = makeImageData(1, 1, [20, 18, 15, 255])
    removeWhiteBackgroundFromImageData(imageData)
    expect(imageData.data[3]).toBe(255)
    expect(imageData.data[0]).toBe(20)
  })
})

describe('findInkBounds', () => {
  it('returns bounds around non-transparent pixels', () => {
    const imageData = makeImageData(10, 10, [255, 255, 255, 0])
    imageData.data[(5 * 10 + 5) * 4 + 3] = 255
    imageData.data[(5 * 10 + 5) * 4] = 10
    const bounds = findInkBounds(imageData, 0)
    expect(bounds).toEqual({ x: 5, y: 5, width: 1, height: 1 })
  })

  it('returns null when no ink is present', () => {
    const imageData = makeImageData(4, 4, [255, 255, 255, 0])
    expect(findInkBounds(imageData)).toBeNull()
  })
})
