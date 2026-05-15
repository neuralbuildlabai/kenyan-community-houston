import type { User } from '@supabase/supabase-js'

export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 16
export const PASSWORD_EXPIRY_DAYS = 180
export const PASSWORD_POLICY_VERSION = 'kigh-v1' as const

/** Allowed ASCII special characters for KIGH passwords. */
export const PASSWORD_ALLOWED_SPECIAL_CHARS = `!@#$%^&*()_+-=[]{};':"\\|,.<>/?\`~`

const MS_PER_DAY = 86_400_000

const specialCharSet = new Set(PASSWORD_ALLOWED_SPECIAL_CHARS.split(''))

function hasAllowedSpecialChar(password: string): boolean {
  for (const c of password) {
    if (specialCharSet.has(c)) return true
  }
  return false
}

function hasDisallowedCharacter(password: string): boolean {
  for (const c of password) {
    if (c === ' ') continue
    if (/[A-Za-z0-9]/.test(c)) continue
    if (specialCharSet.has(c)) continue
    return true
  }
  return false
}

export function validatePasswordPolicy(password: string): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const p = password

  if (!p || p.length === 0) {
    errors.push('Password is required.')
    return { ok: false, errors }
  }
  if (p.length < PASSWORD_MIN_LENGTH) {
    errors.push('Password must be at least 6 characters.')
  }
  if (p.length > PASSWORD_MAX_LENGTH) {
    errors.push('Password must be 16 characters or less.')
  }
  if (/\s/.test(p)) {
    errors.push('Password cannot contain spaces.')
  }
  if (!/[A-Z]/.test(p)) {
    errors.push('Password must include an uppercase letter.')
  }
  if (!/[a-z]/.test(p)) {
    errors.push('Password must include a lowercase letter.')
  }
  if (!/[0-9]/.test(p)) {
    errors.push('Password must include a number.')
  }
  if (!hasAllowedSpecialChar(p)) {
    errors.push('Password must include a special character.')
  }
  if (hasDisallowedCharacter(p)) {
    errors.push('Password contains a character that is not allowed.')
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors }
}

/** Short bullets for UI (signup / inline). */
export function mapPasswordPolicyErrorsToSignupHints(errors: string[]): string[] {
  const map: Record<string, string> = {
    'Password is required.': 'Enter a password.',
    'Password must be at least 6 characters.': 'Password must be at least 6 characters.',
    'Password must be 16 characters or less.': 'Password must be 16 characters or less.',
    'Password cannot contain spaces.': 'Remove spaces.',
    'Password must include an uppercase letter.': 'Add an uppercase letter.',
    'Password must include a lowercase letter.': 'Add a lowercase letter.',
    'Password must include a number.': 'Add a number.',
    'Password must include a special character.': 'Add a symbol.',
    'Password contains a character that is not allowed.': 'Use only letters, numbers, and allowed symbols.',
  }
  return errors.map((e) => map[e] ?? e)
}

export function getPasswordPolicySummary(): string[] {
  return [
    `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
    'At least one uppercase letter',
    'At least one lowercase letter',
    'At least one number',
    'At least one allowed symbol (!@#$%^&* …)',
    'No spaces',
  ]
}

export function passwordPolicyChecklist(password: string, confirm: string) {
  const v = validatePasswordPolicy(password)
  const errSet = new Set(v.errors)
  const lenOk = password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH
  return [
    {
      label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
      pass: lenOk,
    },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    {
      label: 'Special character',
      pass: [...password].some((c) => specialCharSet.has(c)),
    },
    { label: 'No spaces', pass: !/\s/.test(password) },
    { label: 'Allowed characters only', pass: !errSet.has('Password contains a character that is not allowed.') },
    { label: 'Passwords match', pass: password.length > 0 && password === confirm },
  ]
}

/**
 * True when the password is older than PASSWORD_EXPIRY_DAYS or `changedAt` is missing/invalid.
 * Used for unit tests and fallback when `password_expires_at` is not set.
 */
export function isPasswordExpired(passwordChangedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (passwordChangedAt == null || passwordChangedAt === '') return true
  const t = new Date(passwordChangedAt).getTime()
  if (Number.isNaN(t)) return true
  const expiry = t + PASSWORD_EXPIRY_DAYS * MS_PER_DAY
  return now.getTime() >= expiry
}

export function getPasswordExpiryDate(passwordChangedAt: string | null | undefined): Date | null {
  if (passwordChangedAt == null || passwordChangedAt === '') return null
  const t = new Date(passwordChangedAt).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t + PASSWORD_EXPIRY_DAYS * MS_PER_DAY)
}

export function passwordRotationAfterChangePayload(now: Date = new Date()) {
  const expires = new Date(now.getTime() + PASSWORD_EXPIRY_DAYS * MS_PER_DAY)
  return {
    password_changed_at: now.toISOString(),
    password_expires_at: expires.toISOString(),
    force_password_change: false,
    password_policy_version: PASSWORD_POLICY_VERSION,
  } as const
}

/** True when the user has an email/password identity (vs OAuth-only). */
export function hasEmailPasswordIdentity(user: User | null | undefined): boolean {
  if (!user) return false
  const idents = user.identities ?? []
  if (idents.length === 0) return true
  return idents.some((i) => i.provider === 'email')
}
