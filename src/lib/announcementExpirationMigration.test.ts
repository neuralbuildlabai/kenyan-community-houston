import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 067 announcement expiration', () => {
  it('adds expiration columns, constraint, index, and public RLS window', () => {
    const p = resolve(
      process.cwd(),
      'supabase/migrations/067_announcement_expiration_and_priority.sql'
    )
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('expires_at timestamptz')
    expect(sql).toContain('is_featured boolean not null default false')
    expect(sql).toContain('priority integer not null default 0')
    expect(sql).toContain('announcements_expires_after_publish_chk')
    expect(sql).toContain('announcements_homepage_idx')
    expect(sql).toContain("status = 'published'")
    expect(sql).toContain('expires_at is null or expires_at >= now()')
  })
})
