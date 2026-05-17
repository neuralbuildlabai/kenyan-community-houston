import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 039 — super admin authority and admin RPCs.
 */
describe('migration 039 super admin authority', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/039_super_admin_authority_and_admin_rpcs.sql'),
    'utf8'
  )

  it('re-asserts is_admin delegates to kigh_is_elevated_admin', () => {
    expect(sql).toMatch(/create or replace function public\.is_admin\(\)/)
    expect(sql).toContain('select public.kigh_is_elevated_admin()')
  })

  it('ensures admin@kenyancommunityhouston.org as active super_admin', () => {
    expect(sql).toContain("admin@kenyancommunityhouston.org")
    expect(sql).toMatch(/role\s*=\s*'super_admin'/i)
    expect(sql).toMatch(/membership_status\s*=\s*'active'/i)
    expect(sql).toMatch(/good_standing\s*=\s*true/i)
  })

  it('defines admin_update_member_status guarded by kigh_is_elevated_admin', () => {
    expect(sql).toMatch(/function public\.admin_update_member_status\(/)
    expect(sql).toMatch(/if not public\.kigh_is_elevated_admin\(\) then[\s\S]*raise exception 'forbidden'/i)
    expect(sql).toMatch(/grant execute on function public\.admin_update_member_status[\s\S]*to authenticated/)
    expect(sql).not.toMatch(/grant execute on function public\.admin_update_member_status[\s\S]*to anon/)
  })

  it('defines admin_delete_gallery_image guarded by kigh_is_elevated_admin', () => {
    expect(sql).toMatch(/function public\.admin_delete_gallery_image\(/)
    expect(sql).toMatch(/if not public\.kigh_is_elevated_admin\(\) then[\s\S]*raise exception 'forbidden'/i)
    expect(sql).toMatch(/grant execute on function public\.admin_delete_gallery_image[\s\S]*to authenticated/)
    expect(sql).not.toMatch(/grant execute on function public\.admin_delete_gallery_image[\s\S]*to anon/)
  })

  it('revokes gallery delete/update from anon', () => {
    expect(sql).toContain('revoke delete, update on public.gallery_images from anon')
  })

  it('storage delete policies require elevated admin for gallery-public', () => {
    expect(sql).toMatch(
      /gallery_public_delete_admin[\s\S]*bucket_id = 'gallery-public'[\s\S]*kigh_is_elevated_admin\(\)/
    )
  })

  it('does not grant anon member status RPC', () => {
    expect(sql).not.toMatch(/grant execute on function public\.admin_update_member_status[\s\S]*anon/)
  })
})

describe('kigh_is_elevated_admin recognizes super_admin (024)', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/024_admin_analytics_and_health.sql'),
    'utf8'
  )

  it('includes super_admin in elevated role list', () => {
    expect(sql).toMatch(/'super_admin'/)
  })
})
