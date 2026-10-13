import { describe, expect, it } from 'vitest'
import {
  mailtoLink,
  outreachPhoneDigits,
  personalize,
  smsLink,
  uniqueEmails,
  uniquePhones,
  whatsAppLink,
} from './contactOutreach'

describe('outreachPhoneDigits', () => {
  it('treats a bare 10-digit number as US', () => {
    expect(outreachPhoneDigits('(713) 555-1234')).toBe('17135551234')
  })
  it('keeps numbers that already carry a country code', () => {
    expect(outreachPhoneDigits('+254712345678')).toBe('254712345678')
    expect(outreachPhoneDigits('17135551234')).toBe('17135551234')
  })
  it('rejects empty or too-short input', () => {
    expect(outreachPhoneDigits('')).toBeNull()
    expect(outreachPhoneDigits(null)).toBeNull()
    expect(outreachPhoneDigits('12345')).toBeNull()
  })
})

describe('links', () => {
  it('builds a wa.me link with encoded text', () => {
    expect(whatsAppLink('7135551234', 'Hi & welcome')).toBe('https://wa.me/17135551234?text=Hi%20%26%20welcome')
  })
  it('omits the query when text is blank', () => {
    expect(whatsAppLink('7135551234', '  ')).toBe('https://wa.me/17135551234')
  })
  it('builds an sms link', () => {
    expect(smsLink('7135551234', 'Hi')).toBe('sms:+17135551234?&body=Hi')
  })
  it('returns null for an unusable phone', () => {
    expect(whatsAppLink(null, 'x')).toBeNull()
    expect(smsLink('', 'x')).toBeNull()
  })
})

describe('mailtoLink', () => {
  it('puts everyone in bcc', () => {
    expect(mailtoLink({ bcc: ['a@x.org', 'b@x.org'], subject: 'Update' })).toBe(
      'mailto:?bcc=a%40x.org,b%40x.org&subject=Update'
    )
  })
  it('returns null when the URL would be too long for mail clients', () => {
    const bcc = Array.from({ length: 200 }, (_, i) => `person${i}@example.org`)
    expect(mailtoLink({ bcc })).toBeNull()
  })
})

describe('dedupe', () => {
  const contacts = [
    { name: 'A', phone: '713-555-1234', email: 'A@x.org' },
    { name: 'B', phone: '+17135551234', email: 'a@x.org' },
    { name: 'C', phone: null, email: null },
  ]
  it('dedupes emails case-insensitively', () => {
    expect(uniqueEmails(contacts)).toEqual(['A@x.org'])
  })
  it('dedupes phones after normalizing', () => {
    expect(uniquePhones(contacts)).toEqual(['+17135551234'])
  })
})

describe('personalize', () => {
  it('fills {name} with the first name', () => {
    expect(personalize('Hi {name}!', 'Wanjiru Kamau')).toBe('Hi Wanjiru!')
  })
  it('falls back when the name is blank', () => {
    expect(personalize('Hi {name}!', ' ')).toBe('Hi there!')
  })
})
