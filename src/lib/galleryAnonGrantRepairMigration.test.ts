import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 077 — repair anon grants on gallery_images.
 *
 * Production had drifted to table-wide anon SELECT, exposing submitter
 * PII columns. Guard that the repair revokes table-wide SELECT and
 * re-grants only the public-safe column set.
 */
describe('migration 077 gallery anon grant repair', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/077_gallery_images_anon_column_grant_repair.sql'),
    'utf8'
  )

  it('revokes table-wide SELECT from anon and public', () => {
    expect(sql).toContain('revoke select on public.gallery_images from anon;')
    expect(sql).toContain('revoke select on public.gallery_images from public;')
  })

  it('re-grants only the public-safe columns to anon', () => {
    const grantStart = sql.indexOf('grant select')
    const grantEnd = sql.indexOf('to anon', grantStart)
    expect(grantStart).toBeGreaterThan(-1)
    expect(grantEnd).toBeGreaterThan(grantStart)
    const grant = sql.slice(grantStart, grantEnd)
    for (const col of ['id', 'album_id', 'image_url', 'thumbnail_url', 'caption', 'alt_text', 'status']) {
      expect(grant).toContain(col)
    }
    expect(grant).not.toMatch(/submitted_by_|approved_by|submission_|taken_at|community_id/)
  })

  it('never grants table-wide SELECT back to anon', () => {
    expect(sql).not.toMatch(/grant select on public\.gallery_images to anon/)
  })
})
