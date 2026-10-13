import { normalizePhoneNumber } from '@/lib/phoneValidation'

/**
 * Zero-provider outreach helpers for the admin volunteer and vendor lists.
 * Everything here builds links that open the admin's own WhatsApp, Messages,
 * or mail app — nothing is sent from the server, so no Twilio/Resend account
 * is needed and nothing costs money.
 */

export type OutreachContact = {
  name: string
  phone: string | null
  email: string | null
}

/**
 * Digits for wa.me / sms links. Signups are mostly Houston numbers typed
 * without a country code, so a bare 10-digit number is treated as US (+1).
 * Anything that already carries a + or 11+ digits is left as typed.
 */
export function outreachPhoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null
  const stripped = normalizePhoneNumber(phone)
  const digits = stripped.replace(/\D/g, '')
  if (digits.length < 7) return null
  if (!stripped.startsWith('+') && digits.length === 10) return `1${digits}`
  return digits
}

export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
  const digits = outreachPhoneDigits(phone)
  if (!digits) return null
  const q = text.trim() ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${q}`
}

/** `sms:` with a body. `?&body=` is the form both iOS and Android accept. */
export function smsLink(phone: string | null | undefined, text: string): string | null {
  const digits = outreachPhoneDigits(phone)
  if (!digits) return null
  const q = text.trim() ? `?&body=${encodeURIComponent(text)}` : ''
  return `sms:+${digits}${q}`
}

/**
 * Mail clients reject very long mailto URLs (~2000 chars is the safe
 * ceiling), so callers fall back to copying the address list when this
 * returns null.
 */
export const MAILTO_SAFE_LENGTH = 1900

export function mailtoLink(opts: {
  to?: string[]
  bcc?: string[]
  subject?: string
  body?: string
}): string | null {
  const params: string[] = []
  if (opts.bcc?.length) params.push(`bcc=${opts.bcc.map(encodeURIComponent).join(',')}`)
  if (opts.subject?.trim()) params.push(`subject=${encodeURIComponent(opts.subject)}`)
  if (opts.body?.trim()) params.push(`body=${encodeURIComponent(opts.body)}`)
  const to = (opts.to ?? []).map(encodeURIComponent).join(',')
  const url = `mailto:${to}${params.length ? `?${params.join('&')}` : ''}`
  return url.length <= MAILTO_SAFE_LENGTH ? url : null
}

export function uniqueEmails(contacts: OutreachContact[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of contacts) {
    const e = c.email?.trim()
    if (!e) continue
    const key = e.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

/** One +E.164-style number per contact, deduped — pasteable into a WhatsApp group "add participants" or a phone's group text. */
export function uniquePhones(contacts: OutreachContact[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of contacts) {
    const d = outreachPhoneDigits(c.phone)
    if (!d || seen.has(d)) continue
    seen.add(d)
    out.push(`+${d}`)
  }
  return out
}

/** First name for a friendlier per-person message. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

/** Replace `{name}` with the contact's first name so one template works for bulk and 1:1 sends. */
export function personalize(template: string, name: string): string {
  const first = firstName(name)
  return template.replace(/\{name\}/g, first || 'there')
}
