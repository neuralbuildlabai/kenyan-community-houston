/** Blocked weak passwords (lowercase comparison). */
export const ADMIN_WEAK_PASSWORDS = new Set(
  [
    'password',
    'password123',
    'admin',
    'admin123',
    'qwerty',
    'qwerty123',
    '123456',
    '12345678',
    '123456789',
    'welcome',
    'welcome123',
    'changeme',
    'letmein',
  ].map((s) => s.toLowerCase())
)

export type AdminPasswordCheck = { ok: true } | { ok: false; errors: string[] }

function emailLocalPart(email: string): string {
  const t = email.trim().toLowerCase()
  const at = t.indexOf('@')
  return at > 0 ? t.slice(0, at) : t
}

export function validateNewAdminPassword(password: string, email: string, confirm: string): AdminPasswordCheck {
  const errors: string[] = []
  const p = password
  const lower = p.toLowerCase()

  if (p.length < 12) errors.push('At least 12 characters')
  if (!/[A-Z]/.test(p)) errors.push('At least one uppercase letter')
  if (!/[a-z]/.test(p)) errors.push('At least one lowercase letter')
  if (!/[0-9]/.test(p)) errors.push('At least one number')
  if (!/[^A-Za-z0-9]/.test(p)) errors.push('At least one special character')

  const local = emailLocalPart(email)
  if (local.length > 0 && lower.includes(local)) {
    errors.push('Must not contain your email username')
  }

  if (ADMIN_WEAK_PASSWORDS.has(lower)) {
    errors.push('Must not be a common weak password')
  }

  if (p !== confirm) errors.push('Passwords must match')

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}

export function newAdminPasswordChecklist(password: string, email: string, confirm: string) {
  const local = emailLocalPart(email)
  const lower = password.toLowerCase()
  return [
    { label: '12+ characters', pass: password.length >= 12 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
    { label: 'Does not include email username', pass: local.length === 0 || !lower.includes(local) },
    { label: 'Not a common weak password', pass: !ADMIN_WEAK_PASSWORDS.has(lower) },
    { label: 'Passwords match', pass: password.length > 0 && password === confirm },
  ]
}

const MS_PER_DAY = 86400000

/** Days since password_changed_at; null => treat as expired/unset. */
export function adminPasswordAgeDays(passwordChangedAt: string | null | undefined): number | null {
  if (!passwordChangedAt) return null
  const t = new Date(passwordChangedAt).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((Date.now() - t) / MS_PER_DAY)
}

export function adminPasswordExpired(passwordChangedAt: string | null | undefined, maxDays = 180): boolean {
  const age = adminPasswordAgeDays(passwordChangedAt)
  if (age === null) return true
  return age >= maxDays
}
