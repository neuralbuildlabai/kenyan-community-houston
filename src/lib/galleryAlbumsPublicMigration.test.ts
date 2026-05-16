import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 038 gallery albums public view', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/038_gallery_albums_public_view.sql'),
    'utf8'
  )

  it('creates gallery_albums_public without submitter PII', () => {
    expect(sql).toContain('create view public.gallery_albums_public')
    expect(sql).not.toMatch(/submitted_by_email/)
    expect(sql).not.toMatch(/submitted_by_name/)
  })

  it('uses gallery_images_public in EXISTS, not gallery_images', () => {
    expect(sql).toContain('gallery_images_public')
    const policyStart = sql.indexOf('create policy "Public can read gallery albums"')
    const policyBody = sql.slice(policyStart)
    expect(policyBody).not.toMatch(/from public\.gallery_images[^_]/)
  })

  it('grants SELECT on the view to anon and authenticated', () => {
    expect(sql).toMatch(
      /grant select on public\.gallery_albums_public to anon,\s*authenticated/
    )
  })
})
