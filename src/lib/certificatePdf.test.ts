import { describe, expect, it } from 'vitest'
import { CERTIFICATE_CAPTURE_SCALE } from './certificatePdf'

describe('certificatePdf export settings', () => {
  it('uses a high html2canvas scale for sharp print/PDF output', () => {
    expect(CERTIFICATE_CAPTURE_SCALE).toBeGreaterThanOrEqual(2)
    expect(CERTIFICATE_CAPTURE_SCALE).toBe(3)
  })
})
