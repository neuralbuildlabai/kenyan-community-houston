import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { galleryObjectPath } from '@/lib/galleryConstants'

describe('galleryObjectPath', () => {
  const base = 'https://abc.supabase.co/storage/v1/object'

  it('reads the object path from the stored public-style URL', () => {
    expect(galleryObjectPath(`${base}/public/gallery-public/published/a1/b2-thumb.webp`)).toBe(
      'published/a1/b2-thumb.webp'
    )
    expect(galleryObjectPath(`${base}/public/gallery-public/admin/c3-web.jpg`)).toBe('admin/c3-web.jpg')
  })

  it('accepts signed and authenticated forms and drops query strings', () => {
    expect(galleryObjectPath(`${base}/sign/gallery-public/admin/c3-web.jpg?token=x`)).toBe('admin/c3-web.jpg')
    expect(galleryObjectPath(`${base}/authenticated/gallery-public/a%20b.jpg`)).toBe('a b.jpg')
  })

  it('ignores other buckets, static files and empty values', () => {
    expect(galleryObjectPath(`${base}/public/kigh-submission-media/x.jpg`)).toBeNull()
    expect(galleryObjectPath('/kigh-media/houstonmainimage-hero.jpg')).toBeNull()
    expect(galleryObjectPath(null)).toBeNull()
    expect(galleryObjectPath('')).toBeNull()
  })
})

describe('migrations 092/093 gallery member access', () => {
  const access = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/092_gallery_member_access.sql'),
    'utf8'
  )
  const flip = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/093_gallery_bucket_private.sql'),
    'utf8'
  )

  it('092 is additive: it never changes the bucket', () => {
    expect(access).not.toMatch(/update storage\.buckets/)
  })

  it('093 only makes the bucket private', () => {
    expect(flip).toContain("update storage.buckets set public = false where id = 'gallery-public'")
  })

  it('limits full browsing to approved members and admins, rows and files alike', () => {
    const approved = access.match(/public\.kigh_is_approved_member\(\)/g) ?? []
    expect(approved.length).toBeGreaterThanOrEqual(2)
    expect(access).toContain("status = 'published'")
    expect(access).not.toMatch(/auth\.role\(\)\s*=\s*'authenticated'/)
  })

  it('opens only the cover file of a public album, not the rest of it', () => {
    expect(access).toContain("coalesce(ga.visibility, 'public') = 'public'")
    expect(access).toContain("substring(ga.cover_url from '/gallery-public/([^?]+)') = p_name")
  })

  it('is a locked-down security definer helper', () => {
    expect(access).toContain('security definer')
    expect(access).toContain('set search_path = public')
    expect(access).toContain('revoke all on function public.kigh_gallery_object_readable(text) from public')
  })
})
