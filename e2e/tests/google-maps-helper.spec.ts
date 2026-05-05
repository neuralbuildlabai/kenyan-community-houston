import { test, expect } from '@playwright/test'
import { googleMapsSearchUrl } from '../../src/lib/maps'

test.describe('googleMapsSearchUrl', () => {
  test('prefers street address over venue when both provided', () => {
    const url = googleMapsSearchUrl({ address: '123 Main St, Houston, TX', location: 'Community Hall' })
    expect(url).toBeTruthy()
    expect(url).toContain(encodeURIComponent('123 Main St, Houston, TX'))
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=')
  })

  test('falls back to location when address empty', () => {
    const url = googleMapsSearchUrl({ address: '', location: 'Sugar Land Town Square' })
    expect(url).toContain(encodeURIComponent('Sugar Land Town Square'))
  })

  test('returns null when no query', () => {
    expect(googleMapsSearchUrl({ address: null, location: '   ' })).toBeNull()
  })
})
