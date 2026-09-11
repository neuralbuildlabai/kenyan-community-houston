-- ============================================================
-- 076 — Gallery: members-only browsing, homepage teaser for anon
-- ============================================================
-- Problem:
--   Migration 052 converted public.gallery_images_public (and
--   gallery_albums_public) to `security_invoker = on` and re-created
--   the "Public can read published gallery images" policy scoped
--   `to anon` only. Signed-in members (role `authenticated`) were not
--   covered, and the only other SELECT-capable policy on
--   gallery_images is "Admins manage gallery images"
--   (kigh_is_elevated_admin()). Result: logged-in non-admin members
--   saw "No photos yet" on /gallery, while anon could browse it all.
--
-- Desired access (product decision, Sept 2026):
--   * Signed-in accounts browse every published photo.
--   * Anon sees only the handful of photos admins flag
--     is_homepage_featured (homepage "Community moments" teaser);
--     /gallery shows anon a sign-in prompt instead of the grid.
--
-- Fix:
--   1. Replace the anon-wide published policy with:
--        - authenticated: all published rows
--        - anon: published rows that are homepage-featured
--   2. Keep the PII boundary for authenticated: migration 036 left
--      authenticated with table-wide SELECT (for admins). Now that
--      authenticated can read published rows, a direct REST call with
--      `select=submitted_by_email` would leak submitter identity.
--      Replace the table-wide grant with the same public-safe column
--      grant anon has (052). Admins read PII through the SECURITY
--      DEFINER admin_list_gallery_images() RPC (migration 040), which
--      is unaffected. Admin UPDATE/INSERT privileges are unchanged.
--
-- Note: image files live in the public `gallery-public` storage
-- bucket, so a direct file URL still loads for anyone who has it.
-- This migration removes anon's ability to list/browse photos.
--
-- No data migration.
-- ============================================================

-- ─── 1. Row visibility ─────────────────────────────────────────
drop policy if exists "Public can read published gallery images"
  on public.gallery_images;
drop policy if exists "Members can read published gallery images"
  on public.gallery_images;
drop policy if exists "Public can read homepage featured gallery images"
  on public.gallery_images;

create policy "Members can read published gallery images"
  on public.gallery_images for select
  to authenticated
  using (status = 'published');

comment on policy "Members can read published gallery images" on public.gallery_images is
  'Signed-in accounts may browse all published rows. Column-level grants keep '
  'PII (submitted_by_*, approved_by, submission paths) unselectable (migration 076).';

create policy "Public can read homepage featured gallery images"
  on public.gallery_images for select
  to anon
  using (status = 'published' and is_homepage_featured = true);

comment on policy "Public can read homepage featured gallery images" on public.gallery_images is
  'Anon may read only published, homepage-featured rows (homepage teaser). '
  'The full gallery is members-only (migration 076).';

-- ─── 2. Column-level SELECT for authenticated (PII boundary) ────
revoke select on public.gallery_images from authenticated;

grant select
  (id, album_id, image_url, thumbnail_url, caption, alt_text, status,
   is_homepage_featured, sort_order, created_at, updated_at)
  on public.gallery_images
  to authenticated;
