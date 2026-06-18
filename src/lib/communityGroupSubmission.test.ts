import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  submissionPurposeBadge,
  submissionPurposeIncludesJuly,
} from '@/lib/communityGroupSubmission'

describe('migration 065 community groups submission enhancements', () => {
  it('adds submission purpose, contact, and July fields', () => {
    const p = resolve(
      process.cwd(),
      'supabase/migrations/065_community_groups_submission_enhancements.sql'
    )
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('submission_purpose')
    expect(sql).toContain('contact_person_name')
    expect(sql).toContain('authorized_submission')
    expect(sql).toContain('july_interest')
    expect(sql).toContain('directory_and_july_participation')
    expect(sql).not.toContain('july_participation_only')
  })
})

describe('communityGroupSubmission helpers', () => {
  it('detects July-inclusive purposes', () => {
    expect(submissionPurposeIncludesJuly('directory_listing')).toBe(false)
    expect(submissionPurposeIncludesJuly('directory_and_july_participation')).toBe(true)
    expect(submissionPurposeIncludesJuly('update_existing_and_july_participation')).toBe(true)
  })

  it('maps purpose badges for admin', () => {
    expect(submissionPurposeBadge('directory_listing')).toBe('Directory Listing')
    expect(submissionPurposeBadge('update_existing_and_july_participation')).toBe('Update + July')
  })
})
