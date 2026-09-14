import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Migration 078 — sign-in activity RPCs behind /admin/sign-ins.
 *
 * These read analytics_events, which holds identifiable visit history, so the
 * elevated-admin guard and the grant surface must not regress.
 */
describe('migration 078 admin sign-in activity', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/078_admin_sign_in_activity.sql'),
    'utf8'
  )

  it('defines both RPCs the page calls', () => {
    expect(sql).toContain('create or replace function public.kigh_admin_sign_ins(')
    expect(sql).toContain('create or replace function public.kigh_admin_sign_in_activity(')
  })

  it('guards every function with the elevated-admin check', () => {
    const guards = sql.match(/not public\.kigh_is_elevated_admin\(\)/g) ?? []
    expect(guards).toHaveLength(2)
    expect(sql).toMatch(/raise exception 'forbidden' using errcode = '42501'/)
  })

  it('runs as security definer with a pinned search_path', () => {
    const definers = sql.match(/security definer/g) ?? []
    expect(definers).toHaveLength(2)
    const paths = sql.match(/set search_path = public/g) ?? []
    expect(paths).toHaveLength(2)
  })

  it('grants execute to authenticated only, never to anon or public', () => {
    expect(sql).toContain('grant execute on function public.kigh_admin_sign_ins(integer, integer, text) to authenticated;')
    expect(sql).toContain('grant execute on function public.kigh_admin_sign_in_activity(uuid, integer) to authenticated;')
    expect(sql).toMatch(/revoke all on function public\.kigh_admin_sign_ins\(integer, integer, text\) from public;/)
    expect(sql).toMatch(/revoke all on function public\.kigh_admin_sign_in_activity\(uuid, integer\) from public;/)
    expect(sql).not.toMatch(/grant execute on function public\.kigh_admin_sign_in[^;]*to anon/)
  })

  it('bounds the day and row windows so a caller cannot ask for everything', () => {
    expect(sql).toContain("greatest(1, least(coalesce(p_days, 30), 366))")
    expect(sql).toContain("greatest(1, least(coalesce(p_limit, 200), 1000))")
    expect(sql).toContain("greatest(1, least(coalesce(p_limit, 300), 1000))")
  })

  it('scopes a visit to the events between one sign-in and the next on that session', () => {
    expect(sql).toContain('lead(ae.created_at) over (')
    expect(sql).toContain('l.next_login_at is null or ae.created_at < l.next_login_at')
    expect(sql).toContain("ae.event_type <> 'login'")
  })

  it('is idempotent — indexes use if not exists and functions use create or replace', () => {
    expect(sql).toContain('create index if not exists analytics_events_session_created_idx')
    expect(sql).toContain('create index if not exists analytics_events_user_created_idx')
    expect(sql).not.toMatch(/^\s*create index (?!if not exists)/m)
  })
})
