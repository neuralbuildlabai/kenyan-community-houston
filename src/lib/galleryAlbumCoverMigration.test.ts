import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 082 gallery album cover', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/082_gallery_album_cover_public.sql'),
    'utf8',
  )

  it('keeps one published photo as the album cover', () => {
    expect(sql).toContain('create or replace function public.kigh_ensure_gallery_album_cover()')
    expect(sql).toContain('security definer')
    expect(sql).toContain('set search_path = public')
    expect(sql).toContain("if tg_op is null then")
    expect(sql).toContain("raise exception 'forbidden'")
    expect(sql).toContain('gallery_images_ensure_album_cover')
    expect(sql).toContain("gi.status = 'published'")
  })

  it('rejects direct calls and only grants execute for the row trigger', () => {
    expect(sql).toContain('revoke all on function public.kigh_ensure_gallery_album_cover() from public')
    expect(sql).toContain('grant execute on function public.kigh_ensure_gallery_album_cover() to anon, authenticated')
    expect(sql).toContain("raise exception 'forbidden'")
  })

  it('shows albums with a cover without listing their other photos', () => {
    expect(sql).toContain("nullif(btrim(ga.cover_url), '') is not null")
    expect(sql).toContain("nullif(btrim(cover_url), '') is not null")
    expect(sql).toContain('alter view public.gallery_albums_public set (security_invoker = on)')
    expect(sql).not.toMatch(/create policy "Public can read published gallery images"/)
  })
})
