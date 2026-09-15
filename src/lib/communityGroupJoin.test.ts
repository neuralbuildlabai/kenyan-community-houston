import { describe, expect, it } from 'vitest'
import {
  buildJoinRequestForwardMailto,
  joinRequestErrorMessage,
  resolveGroupContactEmail,
  validateJoinRequestInput,
} from '@/lib/communityGroupJoin'

describe('validateJoinRequestInput', () => {
  it('accepts a complete request', () => {
    expect(validateJoinRequestInput({ name: 'Achieng Otieno', email: 'achieng@example.com' })).toBeNull()
  })

  it('requires a name and a valid email', () => {
    expect(validateJoinRequestInput({ name: ' ', email: 'a@example.com' })).toMatch(/name/)
    expect(validateJoinRequestInput({ name: 'Achieng', email: 'not-an-email' })).toMatch(/email/)
  })

  it('caps the message length', () => {
    expect(validateJoinRequestInput({ name: 'Achieng', email: 'a@example.com', message: 'x'.repeat(1001) }))
      .toMatch(/1000/)
  })
})

describe('joinRequestErrorMessage', () => {
  it('maps raised RPC codes to friendly copy', () => {
    expect(joinRequestErrorMessage('rate_limited')).toMatch(/tomorrow/)
    expect(joinRequestErrorMessage('ERROR: group_not_found')).toMatch(/no longer/)
  })

  it('falls back to a generic message', () => {
    expect(joinRequestErrorMessage('connection reset')).toMatch(/try again/)
    expect(joinRequestErrorMessage(null)).toMatch(/try again/)
  })
})

describe('resolveGroupContactEmail', () => {
  it('prefers the outreach contact, then the public inbox, then the submitter', () => {
    expect(resolveGroupContactEmail({
      contact_person_email: 'lead@group.org', public_email: 'info@group.org', submitter_email: 's@group.org',
    })).toBe('lead@group.org')
    expect(resolveGroupContactEmail({ contact_person_email: '', public_email: 'info@group.org' }))
      .toBe('info@group.org')
    expect(resolveGroupContactEmail({ submitter_email: 's@group.org' })).toBe('s@group.org')
  })

  it('skips malformed addresses and returns null when none are usable', () => {
    expect(resolveGroupContactEmail({ contact_person_email: 'n/a', public_email: 'info@group.org' }))
      .toBe('info@group.org')
    expect(resolveGroupContactEmail({ public_email: '  ' })).toBeNull()
    expect(resolveGroupContactEmail(null)).toBeNull()
  })
})

describe('buildJoinRequestForwardMailto', () => {
  const base = {
    groupName: 'Katy Cypress Women Group',
    contactName: 'Carol',
    contactEmail: 'carol@example.com',
    requesterName: 'Wanjiku Mwangi',
    requesterEmail: 'wanjiku@example.com',
    requesterPhone: '+18325550100',
    message: 'I just moved to Katy & would love to connect.',
    requestedAt: '2026-09-14T15:00:00Z',
  }

  it('addresses the group contact and CCs the requester', () => {
    const href = buildJoinRequestForwardMailto(base)
    expect(href.startsWith('mailto:carol%40example.com?')).toBe(true)
    expect(href).toContain('cc=wanjiku%40example.com')
  })

  it('carries the request details, safely encoded', () => {
    const href = buildJoinRequestForwardMailto(base)
    const body = decodeURIComponent(href.split('&body=')[1])
    expect(body).toContain('Hello Carol,')
    expect(body).toContain('Wanjiku Mwangi')
    expect(body).toContain('+18325550100')
    expect(body).toContain('Katy & would love to connect.')
    // The raw ampersand must not break the query string.
    expect(href.split('&body=')[1]).not.toContain('&')
  })

  it('omits empty optional fields', () => {
    const body = decodeURIComponent(
      buildJoinRequestForwardMailto({ ...base, contactName: null, requesterPhone: '', message: null }).split('&body=')[1]
    )
    expect(body.startsWith('Hello,')).toBe(true)
    expect(body).not.toContain('Phone:')
    expect(body).not.toContain('Their message:')
  })
})
