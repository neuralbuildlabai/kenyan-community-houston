import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 076 — members-only gallery browsing.
 *
 * Regression guard: after 052 made gallery_images_public security_invoker,
 * the published-rows policy was anon-only, so logged-in members saw an
 * empty gallery while anon could browse everything. Now signed-in accounts
 * browse all published photos, anon sees only homepage-featured ones, and
 * authenticated must not gain access to submitter PII columns.
 */
describe('migration 076 gallery member read', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/076_gallery_public_read_for_members.sql'),
    'utf8'
  )

  it('drops the anon-wide published-rows policy from 052', () => {
    expect(sql).toMatch(
      /drop policy if exists "Public can read published gallery images"\s+on public\.gallery_images;/
    )
    expect(sql).not.toMatch(/create policy "Public can read published gallery images"/)
  })

  it('lets authenticated read all published rows', () => {
    expect(sql).toMatch(
      /create policy "Members can read published gallery images"\s+on public\.gallery_images for select\s+to authenticated\s+using \(status = 'published'\)/
    )
  })

  it('limits anon to published homepage-featured rows', () => {
    expect(sql).toMatch(
      /create policy "Public can read homepage featured gallery images"\s+on public\.gallery_images for select\s+to anon\s+using \(status = 'published' and is_homepage_featured = true\)/
    )
  })

  it('replaces table-wide authenticated SELECT with a PII-free column grant', () => {
    expect(sql).toContain('revoke select on public.gallery_images from authenticated')
    const grantStart = sql.indexOf('grant select')
    const grantEnd = sql.indexOf('to authenticated', grantStart)
    expect(grantStart).toBeGreaterThan(-1)
    expect(grantEnd).toBeGreaterThan(grantStart)
    const grant = sql.slice(grantStart, grantEnd)
    for (const col of ['id', 'album_id', 'image_url', 'thumbnail_url', 'caption', 'alt_text', 'status']) {
      expect(grant).toContain(col)
    }
    expect(grant).not.toMatch(/submitted_by_|approved_by|submission_/)
  })
})
