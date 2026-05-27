import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 052 — Supabase lint fixes for the four ERROR-level
 * findings flagged in May 2026:
 *   - auth_users_exposed (admin_users view referenced auth.users)
 *   - security_definer_view (4 views: admin_users, gallery_images_public,
 *     gallery_albums_public, members_in_good_standing)
 *   - policy_exists_rls_disabled / rls_disabled_in_public
 *     (admin_user_profiles RLS off in production)
 *
 * These tests guard the SQL shape so the fixes cannot regress without
 * an explicit migration update.
 */
describe('migration 052 security_definer_views_and_rls_repair', () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      'supabase/migrations/052_security_definer_views_and_rls_repair.sql'
    ),
    'utf8'
  )

  describe('admin_user_profiles RLS', () => {
    it('re-enables row level security', () => {
      expect(sql).toMatch(
        /alter table public\.admin_user_profiles enable row level security/
      )
    })

    it('forces RLS so superuser PostgREST calls cannot bypass', () => {
      expect(sql).toMatch(
        /alter table public\.admin_user_profiles force row level security/
      )
    })
  })

  describe('admin_users view', () => {
    it('does NOT reference auth.users in the view body', () => {
      const viewStart = sql.indexOf('create view public.admin_users')
      expect(viewStart).toBeGreaterThan(-1)
      const viewEnd = sql.indexOf(';', viewStart)
      const viewBody = sql.slice(viewStart, viewEnd)
      // This is the whole point of 052 — the lint flagged auth.users.
      expect(viewBody).not.toMatch(/auth\.users/)
      expect(viewBody).not.toMatch(/from\s+auth\./i)
    })

    it('is defined with security_invoker', () => {
      expect(sql).toMatch(
        /create view public\.admin_users\s+with \(security_invoker = on\)/
      )
    })

    it('revokes anon access and grants only to authenticated', () => {
      expect(sql).toMatch(/revoke all on public\.admin_users from anon/)
      expect(sql).toMatch(/grant select on public\.admin_users to authenticated/)
    })

    it('routes last_sign_in_at through the gated helper function', () => {
      expect(sql).toContain(
        'public.admin_user_last_sign_in_at(p.id) as last_sign_in_at'
      )
    })
  })

  describe('admin_user_last_sign_in_at helper', () => {
    it('is SECURITY DEFINER and checks is_admin()', () => {
      const fnStart = sql.indexOf(
        'create or replace function public.admin_user_last_sign_in_at'
      )
      expect(fnStart).toBeGreaterThan(-1)
      const fnEnd = sql.indexOf('$$;', fnStart)
      const fnBody = sql.slice(fnStart, fnEnd)
      expect(fnBody).toContain('security definer')
      expect(fnBody).toContain('public.is_admin()')
    })

    it('revokes execute from public/anon and grants only authenticated', () => {
      expect(sql).toMatch(
        /revoke all on function public\.admin_user_last_sign_in_at\(uuid\) from public/
      )
      expect(sql).toMatch(
        /grant execute on function public\.admin_user_last_sign_in_at\(uuid\) to authenticated/
      )
      // Must not be granted to anon
      expect(sql).not.toMatch(
        /grant execute on function public\.admin_user_last_sign_in_at\(uuid\) to anon/
      )
    })
  })

  describe('gallery views security_invoker conversion', () => {
    it('converts gallery_images_public to security_invoker', () => {
      expect(sql).toMatch(
        /alter view public\.gallery_images_public set \(security_invoker = on\)/
      )
    })

    it('converts gallery_albums_public to security_invoker', () => {
      expect(sql).toMatch(
        /alter view public\.gallery_albums_public set \(security_invoker = on\)/
      )
    })

    it('converts members_in_good_standing to security_invoker', () => {
      expect(sql).toMatch(
        /alter view public\.members_in_good_standing set \(security_invoker = on\)/
      )
    })
  })

  describe('gallery_images column-level grant preserves PII boundary', () => {
    it('grants only the safe column set to anon', () => {
      // Pull the grant block. The grant must NOT include submitted_by_*.
      const grantStart = sql.indexOf('grant select\n  (id, album_id')
      expect(grantStart).toBeGreaterThan(-1)
      const grantEnd = sql.indexOf('to anon', grantStart)
      const grantBody = sql.slice(grantStart, grantEnd)
      expect(grantBody).not.toMatch(/submitted_by_email/)
      expect(grantBody).not.toMatch(/submitted_by_name/)
      expect(grantBody).not.toMatch(/submitted_by_user_id/)
      expect(grantBody).not.toMatch(/approved_by/)
      expect(grantBody).not.toMatch(/submission_storage_/)
    })

    it('reinstates a narrow anon-only SELECT policy on published rows', () => {
      expect(sql).toMatch(
        /create policy "Public can read published gallery images"\s+on public\.gallery_images for select\s+to anon\s+using \(status = 'published'\)/
      )
    })
  })
})
