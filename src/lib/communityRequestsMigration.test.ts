import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 030 community requests', () => {
  it('defines one active thread per user index and create_chat_request RPC', () => {
    const p = resolve(process.cwd(), 'supabase/migrations/030_community_requests_and_event_comments.sql')
    const sql = readFileSync(p, 'utf8')
    expect(sql).toContain('one_active_chat_thread_per_user')
    expect(sql).toContain('create_chat_request')
    expect(sql).toContain('close_chat_request')
  })
})
