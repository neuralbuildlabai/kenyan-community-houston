-- ============================================================
-- 077 — gallery_images: repair anon column grants (production drift)
-- ============================================================
-- Problem:
--   Migration 036 revoked table-wide SELECT on public.gallery_images
--   from anon, and 052 re-granted only the public-safe column set.
--   On the production project (tzrlwleaycawpkzmbqxr) anon still holds
--   table-wide SELECT: a REST call such as
--     /rest/v1/gallery_images?select=submitted_by_email
--   returns rows instead of 42501 (dev returns 42501 as intended).
--   Before 076 that meant submitter PII on every published row was
--   readable by anon. Since 076 anon rows are limited to published
--   homepage-featured images, but PII on those rows would still leak.
--
-- Fix:
--   Revoke table-wide SELECT from anon and PUBLIC, then re-grant the
--   public-safe column set (same list as 052/076). Idempotent: a no-op
--   on projects already in the intended state.
--
-- No data migration.
-- ============================================================

revoke select on public.gallery_images from anon;
revoke select on public.gallery_images from public;

grant select
  (id, album_id, image_url, thumbnail_url, caption, alt_text, status,
   is_homepage_featured, sort_order, created_at, updated_at)
  on public.gallery_images
  to anon;
