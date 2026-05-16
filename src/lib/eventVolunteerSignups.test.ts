import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  VOLUNTEER_SIGNUP_STATUSES,
  buildVolunteerShareMessage,
  buildVolunteerSignupUrl,
  buildVolunteerWhatsAppShareUrl,
  volunteerSignupPath,
  volunteerSignupStatusLabel,
} from '@/lib/eventVolunteerSignup'

describe('eventVolunteerSignup helpers', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', 'https://uat.example.org')
    vi.stubEnv('VITE_APP_URL', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('buildVolunteerSignupUrl uses public site URL and path', () => {
    expect(buildVolunteerSignupUrl('kigh-family-fun-day-2026')).toBe(
      'https://uat.example.org/events/kigh-family-fun-day-2026/volunteer'
    )
  })

  it('volunteerSignupPath encodes slug', () => {
    expect(volunteerSignupPath('a b')).toBe('/events/a%20b/volunteer')
  })

  it('buildVolunteerShareMessage matches handoff copy', () => {
    const msg = buildVolunteerShareMessage('Community Picnic', 'https://x.org/events/picnic/volunteer')
    expect(msg).toContain('Volunteers needed for Community Picnic.')
    expect(msg).toContain('Sign up here:')
    expect(msg).toContain('https://x.org/events/picnic/volunteer')
  })

  it('buildVolunteerWhatsAppShareUrl encodes message', () => {
    const u = buildVolunteerWhatsAppShareUrl('hello world')
    expect(u.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(u.split('text=')[1] ?? '')).toBe('hello world')
  })

  it('VOLUNTEER_SIGNUP_STATUSES and labels cover every status', () => {
    expect(VOLUNTEER_SIGNUP_STATUSES).toHaveLength(5)
    for (const s of VOLUNTEER_SIGNUP_STATUSES) {
      expect(volunteerSignupStatusLabel(s).length).toBeGreaterThan(1)
    }
    expect(volunteerSignupStatusLabel('unknown')).toBe('unknown')
  })
})
