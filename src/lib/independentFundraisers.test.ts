import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  fundraiserSubmitErrorMessage,
  isValidDonationUrl,
  isValidEmail,
  validateIndependentFundraiser,
} from './fundraiserFunding'
import { manageErrorMessage, manageTokenFromHash, parseReportedAmount } from './fundraiserManage'
import { summarizeReportedTotal } from './fundraiserCollections'
import {
  REJECTABLE_TYPES,
  REJECTION_PRESETS,
  rejectionErrorMessage,
} from './submissionRejection'

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/090_independent_fundraisers_and_rejections.sql'),
  'utf8'
)

describe('independent fundraiser submissions', () => {
  it('requires an https donation page and an organizer email', () => {
    expect(validateIndependentFundraiser({ donationUrl: '', organizerEmail: 'a@b.com' })).toMatch(/link/)
    expect(validateIndependentFundraiser({ donationUrl: 'http://gofundme.com/x', organizerEmail: 'a@b.com' })).toMatch(/https/)
    expect(validateIndependentFundraiser({ donationUrl: 'https://gofundme.com/x', organizerEmail: '' })).toMatch(/email/)
    expect(validateIndependentFundraiser({ donationUrl: 'https://gofundme.com/x', organizerEmail: 'nope' })).toMatch(/valid/)
    expect(validateIndependentFundraiser({ donationUrl: 'https://gofundme.com/x', organizerEmail: 'a@b.com' })).toBeNull()
  })

  it('mirrors the database URL and email rules', () => {
    expect(isValidDonationUrl('https://www.gofundme.com/f/help-jane')).toBe(true)
    expect(isValidDonationUrl('https://localhost')).toBe(false)
    expect(isValidDonationUrl('javascript:alert(1)')).toBe(false)
    expect(isValidEmail(' Jane@Example.com ')).toBe(true)
    expect(isValidEmail('jane@example')).toBe(false)
  })

  it('turns database refusals into plain words', () => {
    expect(fundraiserSubmitErrorMessage({ message: 'fundraiser_must_be_independent' })).toMatch(/own donation page/)
    expect(fundraiserSubmitErrorMessage({ message: 'donation_link_required' })).toMatch(/https/)
    expect(fundraiserSubmitErrorMessage({ message: 'something else' })).toBeNull()
  })
})

describe('organizer manage link', () => {
  const token = 'a'.repeat(64)

  it('reads the token from the URL hash only when well formed', () => {
    expect(manageTokenFromHash(`#${token}`)).toBe(token)
    expect(manageTokenFromHash(`#t=${token.toUpperCase()}`)).toBe(token)
    expect(manageTokenFromHash('#short')).toBeNull()
    expect(manageTokenFromHash('')).toBeNull()
  })

  it('parses the amount an organizer types', () => {
    expect(parseReportedAmount('1,250')).toBe(1250)
    expect(parseReportedAmount('$1250.50')).toBe(1250.5)
    expect(parseReportedAmount('-5')).toBeNull()
    expect(parseReportedAmount('12.345')).toBeNull()
    expect(parseReportedAmount('abc')).toBeNull()
  })

  it('explains a dead link', () => {
    expect(manageErrorMessage({ message: 'invalid_manage_link' })).toMatch(/no longer valid/)
  })

  it('summarizes the reported total like a ledger total', () => {
    const s = summarizeReportedTotal(1500, 2000, '2026-10-26T12:00:00Z')
    expect(s.collectedCents).toBe(150000)
    expect(s.percentRaised).toBe(75)
    expect(s.remainingCents).toBe(50000)
    expect(s.goalReached).toBe(false)
    expect(s.lastUpdated).toBe('2026-10-26T12:00:00Z')
    expect(s.rows).toHaveLength(0)
    const over = summarizeReportedTotal('2250', 2000, null)
    expect(over.goalReached).toBe(true)
    expect(over.overageCents).toBe(25000)
    expect(over.progressBarPercent).toBe(100)
  })
})

describe('reject with a note', () => {
  it('offers starting notes for every queue', () => {
    for (const type of REJECTABLE_TYPES) expect(REJECTION_PRESETS[type].length).toBeGreaterThan(0)
  })

  it('explains refusals', () => {
    expect(rejectionErrorMessage({ message: 'rejection_note_required' })).toMatch(/note/)
    expect(rejectionErrorMessage({ message: 'forbidden' })).toMatch(/admins/)
  })
})

describe('migration 090', () => {
  it('moves contacts off the public fundraiser row and keeps them there', () => {
    expect(sql).toContain('create table if not exists public.kigh_submission_private')
    expect(sql).toContain('update public.fundraisers set organizer_contact = null where organizer_contact is not null;')
    expect(sql).toContain('check (organizer_contact is null and organizer_email is null)')
    expect(sql).toContain('using (public.kigh_is_elevated_admin())')
  })

  it('refuses KIGH handles on public submissions', () => {
    expect(sql).toContain("raise exception 'fundraiser_must_be_independent'")
    expect(sql).toMatch(/with check \([\s\S]*funding_mode = 'external'[\s\S]*donation_url is not null/)
  })

  it('stores only a hash of the organizer link', () => {
    expect(sql).toContain("encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')")
    expect(sql).not.toMatch(/manage_token text/)
  })

  it('keeps the admin functions away from anonymous visitors', () => {
    expect(sql).toContain('revoke all on function public.kigh_reject_submission(text, uuid, text, boolean, text) from public, anon;')
    expect(sql).toContain('revoke all on function public.kigh_admin_fundraiser_manage_link(uuid, boolean) from public, anon;')
    expect(sql).toContain("raise exception 'forbidden' using errcode = '42501'")
  })

  it('copies the KIGH inbox on rejection emails', () => {
    expect(sql).toMatch(/v_settings\.notice_from_address,\s*v_settings\.recipients\);/)
  })
})
