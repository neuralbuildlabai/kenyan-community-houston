import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migration 081 gallery-public admin select', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/081_gallery_public_admin_select.sql'),
    'utf8',
  )

  it('lets elevated admins select gallery-public objects so upsert can publish', () => {
    expect(sql).toContain('create policy "gallery_public_select_admin"')
    expect(sql).toContain('on storage.objects for select')
    expect(sql).toContain('to authenticated')
    expect(sql).toMatch(/bucket_id = 'gallery-public'[\s\S]*kigh_is_elevated_admin\(\)/)
  })

  it('does not restore anonymous bucket listing', () => {
    expect(sql).not.toMatch(/create policy "gallery_public_read"/)
    expect(sql).not.toMatch(/using \(bucket_id = 'gallery-public'\);/)
  })
})
