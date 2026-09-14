import { describe, expect, it } from 'vitest'
import {
  describeActivityEvent,
  formatRoleLabel,
  signInDisplayName,
  signInKindLabel,
  type SignInActivityRow,
} from '@/lib/adminSignIns'

const activity = (over: Partial<SignInActivityRow>): SignInActivityRow => ({
  id: 'e1',
  occurred_at: '2026-09-01T12:00:00Z',
  event_type: 'page_view',
  event_name: 'page_view',
  path: '/businesses',
  label: null,
  entity_table: null,
  entity_id: null,
  ...over,
})

describe('signInDisplayName', () => {
  const base = { full_name: null, member_first_name: null, member_last_name: null, email: null }

  it('prefers the profile full name', () => {
    expect(signInDisplayName({ ...base, full_name: 'Wanjiru Kamau', email: 'w@example.com' }))
      .toBe('Wanjiru Kamau')
  })

  it('falls back to the linked member name', () => {
    expect(signInDisplayName({ ...base, member_first_name: 'Otieno', member_last_name: 'Odhiambo' }))
      .toBe('Otieno Odhiambo')
  })

  it('uses a half-complete member name rather than dropping to email', () => {
    expect(signInDisplayName({ ...base, member_first_name: 'Otieno', email: 'o@example.com' }))
      .toBe('Otieno')
  })

  it('falls back to email, then to a neutral placeholder', () => {
    expect(signInDisplayName({ ...base, email: 'a@example.com' })).toBe('a@example.com')
    expect(signInDisplayName(base)).toBe('Unidentified visitor')
  })

  it('ignores whitespace-only names', () => {
    expect(signInDisplayName({ ...base, full_name: '   ', email: 'a@example.com' }))
      .toBe('a@example.com')
  })
})

describe('signInKindLabel', () => {
  it('labels admin and member sign-ins', () => {
    expect(signInKindLabel('admin_login')).toBe('Admin')
    expect(signInKindLabel('member_login')).toBe('Member')
    expect(signInKindLabel(null)).toBe('Member')
  })
})

describe('formatRoleLabel', () => {
  it('humanizes role slugs', () => {
    expect(formatRoleLabel('community_admin')).toBe('Community admin')
    expect(formatRoleLabel('super_admin')).toBe('Super admin')
  })

  it('returns null for missing roles', () => {
    expect(formatRoleLabel(null)).toBeNull()
    expect(formatRoleLabel('  ')).toBeNull()
  })
})

describe('describeActivityEvent', () => {
  it('describes a page view with its path', () => {
    expect(describeActivityEvent(activity({}))).toEqual({
      action: 'Viewed page',
      detail: '/businesses',
    })
  })

  it('quotes the CTA label on a click', () => {
    const { action } = describeActivityEvent(
      activity({ event_type: 'cta_click', event_name: 'list_business', label: 'List your business' })
    )
    expect(action).toContain('List your business')
  })

  it('singularizes the entity table on an entity view', () => {
    const cases: [string, string][] = [
      ['businesses', 'Opened business'],
      ['events', 'Opened event'],
      ['fundraisers', 'Opened fundraiser'],
      ['gallery_albums', 'Opened gallery album'],
    ]
    for (const [table, expected] of cases) {
      expect(describeActivityEvent(
        activity({ event_type: 'entity_view', entity_table: table, entity_id: 'b1' })
      ).action).toBe(expected)
    }
  })

  it('says "record" when the entity table is missing', () => {
    expect(describeActivityEvent(
      activity({ event_type: 'entity_view', entity_table: null })
    ).action).toBe('Opened record')
  })

  it('names the submitted form', () => {
    expect(describeActivityEvent(
      activity({ event_type: 'submission_created', event_name: 'submission_business' })
    ).action).toBe('Submitted business')
  })

  it('falls back to the raw event name for unknown types', () => {
    expect(describeActivityEvent(activity({ event_type: 'something_new', event_name: 'odd_event' })).action)
      .toBe('odd_event')
  })
})
