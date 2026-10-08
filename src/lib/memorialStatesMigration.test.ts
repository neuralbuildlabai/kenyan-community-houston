import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/084_memorial_lifecycle_states.sql'),
  'utf8'
)

describe('migration 084 memorial lifecycle states', () => {
  it('creates the overlay table keyed by registry slug', () => {
    expect(sql).toContain('create table if not exists public.memorial_states')
    expect(sql).toContain('slug        text primary key')
    expect(sql).toContain("status      text not null default 'active'")
    expect(sql).toContain('comment on table public.memorial_states')
  })

  it('constrains the status and keeps the archive stamp consistent', () => {
    expect(sql).toContain('memorial_states_status_chk')
    expect(sql).toContain("status in ('active', 'archived')")
    expect(sql).toContain('memorial_states_archived_at_chk')
    expect(sql).toContain("status = 'archived' and archived_at is not null")
    expect(sql).toContain("status = 'active' and archived_at is null")
  })

  it('lets the public read lifecycle state but only admins write it', () => {
    expect(sql).toContain('"memorial_states public select"')
    expect(sql).toContain('to anon, authenticated')
    expect(sql).toContain('"memorial_states elevated admin write"')
    expect(sql).toContain('public.kigh_is_elevated_admin()')
    expect(sql).toContain('grant insert, update, delete on public.memorial_states to authenticated')
  })

  it('keeps the archiving admin out of public reads via a column grant', () => {
    // A table-wide grant to anon would expose archived_by and cannot be
    // narrowed afterwards — the same trap migration 077 had to repair.
    expect(sql).toContain('revoke select on public.memorial_states from anon')
    expect(sql).toContain('grant select (slug, status, archived_at) on public.memorial_states to anon')
    expect(sql).not.toMatch(/grant select on public\.memorial_states to anon/)
  })

  it('tracks updated_at with the shared trigger', () => {
    expect(sql).toContain('memorial_states_updated_at')
    expect(sql).toContain('execute function public.set_updated_at()')
  })

  it('seeds nothing — a missing row must mean active', () => {
    expect(sql).not.toMatch(/insert\s+into\s+public\.memorial_states/i)
    expect(sql).toContain('A MISSING ROW MEANS ACTIVE')
  })

  it('is idempotent on re-run', () => {
    expect(sql).toContain('create table if not exists')
    expect(sql).toContain('drop policy if exists "memorial_states public select"')
    expect(sql).toContain('drop trigger if exists memorial_states_updated_at')
  })
})
