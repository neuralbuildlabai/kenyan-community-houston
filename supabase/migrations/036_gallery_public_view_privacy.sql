-- ============================================================
-- 036 — Gallery public view: hide submitter PII from anon/public
-- ============================================================
-- Problem:
--   The legacy policy "Public can read published gallery images"
--   (migration 002) granted anon SELECT on public.gallery_images
--   for any row with status = 'published'. The application UI
--   only ever requests the safe columns, but a direct call to the
--   Supabase REST endpoint with `select=*` would expose submitter
--   identity fields (submitted_by_email, submitted_by_name,
--   submitted_by_user_id) that were added in migration 035 for
--   admin review workflows.
--
-- Fix:
--   1. Revoke any direct anon (and unauthenticated) SELECT on
--      public.gallery_images and drop the public read policy so
--      anon cannot read the base table at all.
--   2. Expose only the public-safe columns through a dedicated
--      view, public.gallery_images_public, restricted to
--      status = 'published'.
--   3. Grant SELECT on the view to anon and authenticated.
--   4. Admin pages continue to read public.gallery_images
--      directly via the "Admins manage gallery images" policy
--      (RLS still gates non-admin authenticated users).
--   5. The public submission INSERT policy on gallery_images
--      from migration 035 is unaffected — anon/auth INSERTs
--      remain possible without table SELECT privilege.

-- ─── 1. Drop the legacy anon SELECT policy ──────────────────
drop policy if exists "Public can read published gallery images"
  on public.gallery_images;

-- ─── 2. Revoke direct SELECT from anon on the base table ────
-- Authenticated retains SELECT because admins are authenticated
-- and gated by the "Admins manage gallery images" RLS policy.
revoke select on public.gallery_images from anon;
revoke select on public.gallery_images from public;

-- ─── 3. Create the public-safe view ─────────────────────────
-- Recreate idempotently. The view intentionally OMITS:
--   * submitted_by_email
--   * submitted_by_name
--   * submitted_by_user_id
--   * submission_storage_bucket / path / thumb_path
--   * approved_by / approved_at
--   * taken_at / community_id (not currently rendered publicly)
drop view if exists public.gallery_images_public;

create view public.gallery_images_public as
  select
    gi.id,
    gi.album_id,
    gi.image_url,
    gi.thumbnail_url,
    gi.caption,
    gi.alt_text,
    gi.status,
    gi.is_homepage_featured,
    gi.sort_order,
    gi.created_at,
    gi.updated_at
  from public.gallery_images gi
  where gi.status = 'published';

comment on view public.gallery_images_public is
  'Public-safe projection of gallery_images: only published rows, no submitter PII (migration 036).';

-- ─── 4. Grant SELECT on the view to anon and authenticated ──
grant select on public.gallery_images_public to anon, authenticated;

-- ─── 5. Document the privacy posture on the base table ─────
comment on column public.gallery_images.submitted_by_email is
  'Submitter email captured for admin review. NEVER exposed to anon — see gallery_images_public view (migration 036).';
comment on column public.gallery_images.submitted_by_name is
  'Submitter display name captured for admin review. NEVER exposed to anon — see gallery_images_public view (migration 036).';
comment on column public.gallery_images.submitted_by_user_id is
  'Submitter auth uid captured for admin review. NEVER exposed to anon — see gallery_images_public view (migration 036).';
