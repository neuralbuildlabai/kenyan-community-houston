/** Shown when the value is not empty and not a valid international-style phone. */
export const PHONE_VALIDATION_USER_MESSAGE =
  'Enter a valid phone number using only numbers and an optional + at the beginning.'

const CANONICAL_PHONE = /^\+?[0-9]{7,15}$/

/** Remove spaces, hyphens, parentheses, and dots. Does not remove letters (caller must validate). */
export function normalizePhoneNumber(input: string): string {
  return input.trim().replace(/[\s().-]/g, '')
}

/**
 * Strips typing/paste noise for controlled phone fields: keeps digits and at most one
 * leading `+` (multiple `+` at the start collapse to one). Does not enforce length;
 * use {@link validatePhoneNumber} on submit.
 */
export function sanitizePhoneInput(input: string): string {
  const filtered = input.trim().replace(/[^0-9+]/g, '')
  if (!filtered) return ''

  let i = 0
  let hadLeadingPlus = false
  while (i < filtered.length && filtered[i] === '+') {
    hadLeadingPlus = true
    i++
  }
  const rest = filtered.slice(i)
  const digitsOnly = rest.replace(/\D/g, '')
  if (!digitsOnly) return hadLeadingPlus ? '+' : ''
  return hadLeadingPlus ? `+${digitsOnly}` : digitsOnly
}

/** True when `value` is non-empty and matches `^\+?[0-9]{7,15}$`. */
export function isValidInternationalPhone(value: string): boolean {
  const v = value.trim()
  return v !== '' && CANONICAL_PHONE.test(v)
}

export type PhoneValidationResult =
  | { ok: true; value: string | null }
  | { ok: false; reason: string }

/**
 * Validates after stripping spaces, hyphens, parentheses, and dots.
 * Allows a single leading +; body must be 7–15 digits.
 */
export function validatePhoneNumber(input: string, options?: { allowEmpty?: boolean }): PhoneValidationResult {
  const trimmed = input.trim()
  if (!trimmed) {
    if (options?.allowEmpty) return { ok: true, value: null }
    return { ok: false, reason: PHONE_VALIDATION_USER_MESSAGE }
  }
  if (/[a-zA-Z]/.test(trimmed)) {
    return { ok: false, reason: PHONE_VALIDATION_USER_MESSAGE }
  }
  const stripped = normalizePhoneNumber(trimmed)
  if (!stripped) {
    return { ok: false, reason: PHONE_VALIDATION_USER_MESSAGE }
  }
  if (!/^\+?[0-9]+$/.test(stripped)) {
    return { ok: false, reason: PHONE_VALIDATION_USER_MESSAGE }
  }
  const digits = stripped.startsWith('+') ? stripped.slice(1) : stripped
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, reason: PHONE_VALIDATION_USER_MESSAGE }
  }
  const canonical = stripped.startsWith('+') ? `+${digits}` : digits
  return { ok: true, value: canonical }
}

/** Digits only (no +), for WhatsApp `wa.me` links and `normalized_phone` columns. */
export function phoneDigitsOnly(canonical: string): string {
  return canonical.replace(/\D/g, '')
}
