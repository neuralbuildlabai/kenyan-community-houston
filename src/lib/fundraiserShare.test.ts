import { describe, expect, it } from 'vitest'
import {
  buildFundraiserShareMessage,
  buildWhatsAppShareUrl,
  fundraiserPath,
  fundraiserPublicUrl,
  paymentNoteInstruction,
  paymentReferenceFor,
} from './fundraiserShare'
import { PUBLIC_SITE_URL } from './memberDemographics'

const SLUG = 'support-kigh-at-afrifest'

describe('fundraiserPublicUrl', () => {
  it('builds the permanent address from the configured production origin', () => {
    expect(fundraiserPath(SLUG)).toBe('/community-support/support-kigh-at-afrifest')
    expect(fundraiserPublicUrl(SLUG)).toBe(`${PUBLIC_SITE_URL}/community-support/${SLUG}`)
  })

  it('never produces a localhost, preview or admin URL', () => {
    const url = fundraiserPublicUrl(SLUG)
    expect(url).toMatch(/^https:\/\//)
    expect(url).not.toContain('localhost')
    expect(url).not.toContain('127.0.0.1')
    expect(url).not.toContain('vercel.app')
    expect(url).not.toContain('/admin')
    expect(url).not.toContain('/submit')
  })

  it('does not double the slash when the origin carries a trailing one', () => {
    expect(fundraiserPublicUrl(SLUG, 'https://example.org/')).toBe(
      `https://example.org/community-support/${SLUG}`
    )
  })
})

describe('buildFundraiserShareMessage', () => {
  const url = fundraiserPublicUrl(SLUG)

  it('reads as the suggested WhatsApp message', () => {
    expect(
      buildFundraiserShareMessage({ title: 'Support KIGH at AfriFest', goalAmount: 2000, url })
    ).toBe(`Support Support KIGH at AfriFest. Our goal is $2,000. Read more and donate: ${url}`)
  })

  it('omits the goal sentence rather than claiming a $0 target', () => {
    const message = buildFundraiserShareMessage({ title: 'Welfare drive', goalAmount: null, url })
    expect(message).toBe(`Support Welfare drive. Read more and donate: ${url}`)
    expect(message).not.toContain('$0')
  })

  it('shares the permanent URL, not whatever host the page was opened on', () => {
    expect(buildFundraiserShareMessage({ title: 'Welfare drive', url })).toContain(PUBLIC_SITE_URL)
  })
})

describe('buildWhatsAppShareUrl', () => {
  it('encodes the message into a wa.me link that works on desktop and mobile', () => {
    const message = buildFundraiserShareMessage({
      title: 'Support KIGH at AfriFest',
      goalAmount: 2000,
      url: fundraiserPublicUrl(SLUG),
    })
    const shareUrl = buildWhatsAppShareUrl(message)

    // No phone number: WhatsApp shows its contact picker, which is what both
    // the mobile app and WhatsApp Web/Desktop do with this form.
    expect(shareUrl.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(shareUrl.slice('https://wa.me/?text='.length))).toBe(message)
  })

  it('escapes the characters that would otherwise truncate the message', () => {
    const shareUrl = buildWhatsAppShareUrl('Give now & help: https://x.test/a?b=1 #kigh')
    expect(shareUrl).not.toMatch(/[ #]/)
    expect(shareUrl).toContain('%26')
    expect(shareUrl).toContain('%23')
    expect(shareUrl).toContain('%20')
  })
})

describe('payment note', () => {
  it('uses the configured reference when there is one', () => {
    expect(
      paymentReferenceFor({ title: 'Support KIGH at AfriFest', payment_reference: 'AfriFest' })
    ).toBe('AfriFest')
    expect(
      paymentNoteInstruction({ title: 'Support KIGH at AfriFest', payment_reference: 'AfriFest' })
    ).toBe('Include “AfriFest” in your payment note.')
  })

  it('falls back to the fundraiser title so the note is never blank', () => {
    expect(paymentReferenceFor({ title: 'Welfare drive', payment_reference: null })).toBe(
      'Welfare drive'
    )
    expect(paymentReferenceFor({ title: 'Welfare drive', payment_reference: '   ' })).toBe(
      'Welfare drive'
    )
  })
})
