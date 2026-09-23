import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 080 member gallery album create', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/080_gallery_member_album_create.sql'),
    'utf8',
  )

  it('records who created the album and hides that column from API roles', () => {
    expect(sql).toContain('add column if not exists created_by uuid references auth.users (id) on delete set null')
    expect(sql).toContain('revoke select (created_by) on public.gallery_albums from anon, authenticated')
  })

  it('creates albums only for a signed-in user, closed to public submissions', () => {
    expect(sql).toContain('security definer')
    expect(sql).toContain('set search_path = public')
    expect(sql).toContain('if v_uid is null then')
    expect(sql).toContain("'public'")
    expect(sql).toContain('false')
    expect(sql).toContain('created_by')
    expect(sql).toContain('kigh_contains_blocked_language')
    expect(sql).toMatch(/char_length\(v_name\) < 2 or char_length\(v_name\) > 80/)
    expect(sql).toMatch(/char_length\(v_description\) > 500/)
  })

  it('does not let anonymous callers execute the album rpcs', () => {
    expect(sql).toContain(
      'revoke execute on function public.kigh_create_member_gallery_album(text, text) from anon',
    )
    expect(sql).toContain('grant execute on function public.kigh_create_member_gallery_album(text, text) to authenticated')
    expect(sql).toContain('revoke execute on function public.kigh_list_my_gallery_albums() from anon')
    expect(sql).toContain('grant execute on function public.kigh_list_my_gallery_albums() to authenticated')
    expect(sql).not.toMatch(/grant execute on function public\.kigh_create_member_gallery_album\(text, text\) to anon/)
  })
})
