import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { Event } from '@/lib/types'
import {
  VENDOR_CATEGORIES,
  VENDOR_FEE_DEFAULTS_CENTS,
  VENDOR_PAYMENT_HANDLES,
  VENDOR_PAYMENT_STATUSES,
  VENDOR_SIGNUP_STATUSES,
  buildVendorShareMessage,
  buildVendorSignupUrl,
  buildVendorWhatsAppShareUrl,
  formatVendorFee,
  resolveVendorFeeCents,
  vendorCategoryLabel,
  vendorPaymentStatusLabel,
  vendorSignupPath,
  vendorSignupStatusLabel,
} from '@/lib/eventVendorSignup'

describe('eventVendorSignup helpers', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://uat.example.org')
    vi.stubEnv('VITE_APP_URL', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('buildVendorSignupUrl composes the public site URL and slug path', () => {
    expect(buildVendorSignupUrl('family-fun-day-2026')).toBe(
      'https://uat.example.org/events/family-fun-day-2026/vendor'
    )
  })

  it('vendorSignupPath encodes unsafe slug characters', () => {
    expect(vendorSignupPath('a b')).toBe('/events/a%20b/vendor')
  })

  it('buildVendorShareMessage carries event name and signup link', () => {
    const msg = buildVendorShareMessage(
      'Family Fun Day',
      'https://x.org/events/family-fun-day/vendor'
    )
    expect(msg).toContain('Vendors wanted for Family Fun Day.')
    expect(msg).toContain('Sign up here:')
    expect(msg).toContain('https://x.org/events/family-fun-day/vendor')
  })

  it('buildVendorWhatsAppShareUrl encodes the message into the wa.me link', () => {
    const u = buildVendorWhatsAppShareUrl('hello world')
    expect(u.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(u.split('text=')[1] ?? '')).toBe('hello world')
  })

  it('VENDOR_CATEGORIES covers both supported categories with labels', () => {
    expect(VENDOR_CATEGORIES).toEqual(['food', 'other'])
    for (const c of VENDOR_CATEGORIES) {
      expect(vendorCategoryLabel(c).length).toBeGreaterThan(1)
    }
    expect(vendorCategoryLabel('mystery')).toBe('mystery')
  })

  it('VENDOR_SIGNUP_STATUSES + label fall back gracefully for unknown values', () => {
    expect(VENDOR_SIGNUP_STATUSES).toHaveLength(5)
    for (const s of VENDOR_SIGNUP_STATUSES) {
      expect(vendorSignupStatusLabel(s).length).toBeGreaterThan(1)
    }
    expect(vendorSignupStatusLabel('unknown')).toBe('unknown')
  })

  it('VENDOR_PAYMENT_STATUSES + label fall back gracefully for unknown values', () => {
    expect(VENDOR_PAYMENT_STATUSES).toEqual(['unpaid', 'paid', 'waived', 'refunded'])
    for (const s of VENDOR_PAYMENT_STATUSES) {
      expect(vendorPaymentStatusLabel(s).length).toBeGreaterThan(1)
    }
    expect(vendorPaymentStatusLabel('unknown')).toBe('unknown')
  })

  it('VENDOR_FEE_DEFAULTS_CENTS matches the community standard ($100 food / $50 other)', () => {
    expect(VENDOR_FEE_DEFAULTS_CENTS.food).toBe(10000)
    expect(VENDOR_FEE_DEFAULTS_CENTS.other).toBe(5000)
  })

  it('resolveVendorFeeCents prefers the event override and falls back to defaults', () => {
    const eventWithOverrides = {
      vendor_food_fee_cents: 12500,
      vendor_other_fee_cents: 7500,
    } as Pick<Event, 'vendor_food_fee_cents' | 'vendor_other_fee_cents'>
    expect(resolveVendorFeeCents(eventWithOverrides, 'food')).toBe(12500)
    expect(resolveVendorFeeCents(eventWithOverrides, 'other')).toBe(7500)
    expect(resolveVendorFeeCents(null, 'food')).toBe(VENDOR_FEE_DEFAULTS_CENTS.food)
    expect(resolveVendorFeeCents(undefined, 'other')).toBe(VENDOR_FEE_DEFAULTS_CENTS.other)
    expect(
      resolveVendorFeeCents(
        {
          vendor_food_fee_cents: null,
          vendor_other_fee_cents: null,
        } as Pick<Event, 'vendor_food_fee_cents' | 'vendor_other_fee_cents'>,
        'food'
      )
    ).toBe(VENDOR_FEE_DEFAULTS_CENTS.food)
  })

  it('formatVendorFee renders whole dollars without cents and partials with two decimals', () => {
    expect(formatVendorFee(10000)).toBe('$100')
    expect(formatVendorFee(5000)).toBe('$50')
    expect(formatVendorFee(12345)).toBe('$123.45')
    expect(formatVendorFee(0)).toBe('$0')
  })

  it('VENDOR_PAYMENT_HANDLES include all three networks the user asked for', () => {
    const networks = VENDOR_PAYMENT_HANDLES.map((h) => h.network).sort()
    expect(networks).toEqual(['cashapp', 'paypal', 'venmo'])
    for (const h of VENDOR_PAYMENT_HANDLES) {
      expect(h.handle.length).toBeGreaterThan(0)
      expect(h.label.length).toBeGreaterThan(0)
    }
  })
})
