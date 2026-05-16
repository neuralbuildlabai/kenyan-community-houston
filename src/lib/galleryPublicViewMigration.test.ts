import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 036 — gallery public view privacy.
 *
 * Guards the SQL shape so the public projection cannot regress and
 * accidentally re-expose submitter identity fields to anon users.
 */
describe('migration 036 gallery public view', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/036_gallery_public_view_privacy.sql'),
    'utf8'
  )

  it('drops the legacy anon SELECT policy on gallery_images', () => {
    expect(sql).toMatch(
      /drop policy if exists "Public can read published gallery images"\s+on public\.gallery_images;/
    )
  })

  it('revokes direct anon SELECT on gallery_images', () => {
    expect(sql).toContain('revoke select on public.gallery_images from anon')
    expect(sql).toContain('revoke select on public.gallery_images from public')
  })

  it('creates the public-safe view gallery_images_public', () => {
    expect(sql).toContain('drop view if exists public.gallery_images_public')
    expect(sql).toMatch(/create view public\.gallery_images_public as/)
  })

  it('view selects only the public-safe column set', () => {
    const safeCols = [
      'gi.id',
      'gi.album_id',
      'gi.image_url',
      'gi.thumbnail_url',
      'gi.caption',
      'gi.alt_text',
      'gi.status',
      'gi.is_homepage_featured',
      'gi.sort_order',
      'gi.created_at',
      'gi.updated_at',
    ]
    for (const col of safeCols) {
      expect(sql).toContain(col)
    }
  })

  it('view definition does not expose submitter PII columns', () => {
    const viewStart = sql.indexOf('create view public.gallery_images_public')
    const viewEnd = sql.indexOf(';', viewStart)
    expect(viewStart).toBeGreaterThan(-1)
    const viewBody = sql.slice(viewStart, viewEnd)
    expect(viewBody).not.toMatch(/submitted_by_email/)
    expect(viewBody).not.toMatch(/submitted_by_name/)
    expect(viewBody).not.toMatch(/submitted_by_user_id/)
    expect(viewBody).not.toMatch(/approved_by/)
    expect(viewBody).not.toMatch(/submission_storage_/)
  })

  it('view filters to published rows only', () => {
    expect(sql).toMatch(/where\s+gi\.status\s*=\s*'published'/i)
  })

  it('grants SELECT on the view to anon and authenticated', () => {
    expect(sql).toMatch(
      /grant select on public\.gallery_images_public to anon,\s*authenticated/
    )
  })
})
