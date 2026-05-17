import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GALLERY_UNPUBLISH_STATUS } from './galleryAdminPublished'

describe('migration 040 gallery admin status enum fix', () => {
  const sql = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/040_gallery_admin_status_enum_fix.sql'),
    'utf8'
  )

  it('admin_set_gallery_image_status casts p_status to content_status', () => {
    expect(sql).toMatch(/function public\.admin_set_gallery_image_status\(/)
    expect(sql).toMatch(/status\s*=\s*v_status::content_status/)
    expect(sql).not.toMatch(/status\s*=\s*trim\(p_status\)/)
  })

  it('admin_set_gallery_image_status validates allowed content_status values', () => {
    expect(sql).toMatch(
      /v_allowed constant text\[\] := array\['pending', 'published', 'rejected', 'archived'\]/
    )
    expect(sql).toMatch(/raise exception 'invalid_gallery_status'/i)
    expect(sql).toMatch(/if not public\.kigh_is_elevated_admin\(\) then[\s\S]*raise exception 'forbidden'/i)
    expect(sql).toMatch(
      /grant execute on function public\.admin_set_gallery_image_status\(uuid, text\) to authenticated/
    )
    expect(sql).not.toMatch(
      /grant execute on function public\.admin_set_gallery_image_status\(uuid, text\) to anon/
    )
  })

  it('admin_delete_gallery_image returns gallery-submissions and gallery-public paths', () => {
    expect(sql).toMatch(/function public\.admin_delete_gallery_image\(/)
    expect(sql).toContain('submission_storage_bucket')
    expect(sql).toContain("'gallery-public'")
    expect(sql).toMatch(/grant execute on function public\.admin_delete_gallery_image\(uuid\) to authenticated/)
    expect(sql).not.toMatch(/grant execute on function public\.admin_delete_gallery_image\(uuid\) to anon/)
  })

  it('admin_list_gallery_images is elevated-admin only', () => {
    expect(sql).toMatch(/function public\.admin_list_gallery_images\(/)
    expect(sql).toMatch(/security definer/i)
    expect(sql).toMatch(/grant execute on function public\.admin_list_gallery_images\(\) to authenticated/)
    expect(sql).not.toMatch(/grant execute on function public\.admin_list_gallery_images\(\) to anon/)
  })
})

describe('galleryAdminPublished unpublish status', () => {
  it('maps unpublish to pending for review queue', () => {
    expect(GALLERY_UNPUBLISH_STATUS).toBe('pending')
  })
})
