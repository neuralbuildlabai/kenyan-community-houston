-- ============================================================
-- 054 — Tighten public storage bucket SELECT policies
-- ============================================================
-- Addresses Supabase lint 0025_public_bucket_allows_listing on
-- seven public buckets:
--
--   business-logos, event-flyers, fundraiser-images, gallery,
--   gallery-public, kigh-submission-media, leadership-photos
--
-- Why this is safe:
--
--   Public buckets serve object URLs through the Storage CDN
--   without requiring a storage.objects SELECT policy. The broad
--   `using (bucket_id = '<bucket>')` policies were only useful for
--   `supabase.storage.from(bucket).list()` calls, which enumerate
--   files. A frontend audit (May 2026) confirmed:
--
--     * No `.list()` calls anywhere in src/**/*.ts(x).
--     * Six of the seven buckets are consumed only via
--       `getPublicUrl()` — which bypasses RLS.
--     * `kigh-submission-media` is also consumed via
--       `supabase.storage.from(bucket).download()` from the
--       admin gallery-approval pipeline (galleryAdminApproval.ts).
--       This DOES need storage.objects SELECT — but only for
--       admins, not the anonymous public.
--
-- Plan:
--   * Drop the broad `bucket_id = '<bucket>'` SELECT policies on
--     all six purely public-read buckets. Direct URL access still
--     works because the buckets are marked `public = true`.
--   * For kigh-submission-media, replace the broad SELECT policy
--     with one scoped to elevated admins (matches the existing
--     delete policy in migration 023).
--
-- ============================================================

-- ─── 1. Drop broad SELECT policies on purely public-read buckets ─

drop policy if exists "Public read gallery" on storage.objects;
drop policy if exists "Public read event flyers" on storage.objects;
drop policy if exists "Public read business logos" on storage.objects;
drop policy if exists "Public read fundraiser images" on storage.objects;
drop policy if exists "gallery_public_read" on storage.objects;
drop policy if exists "leadership_photos public read" on storage.objects;

-- Direct URL access via `getPublicUrl()` continues to work for all
-- six buckets because each bucket has `public = true` in
-- storage.buckets, which makes object URLs publicly resolvable
-- regardless of any storage.objects SELECT policy.

-- ─── 2. Replace kigh-submission-media SELECT with admin-scoped ───
-- Migration 023 created a broad public SELECT on this bucket. The
-- admin gallery-approval flow needs SELECT (for .download() calls),
-- but submitters and the general public do not. Direct unguessable
-- URLs still resolve through the public-bucket CDN path; this
-- policy only governs PostgREST-mediated reads.

drop policy if exists "kigh_submission_media_select_public" on storage.objects;
create policy "kigh_submission_media_select_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kigh-submission-media'
    and public.kigh_is_elevated_admin()
  );

comment on policy "kigh_submission_media_select_admin" on storage.objects is
  'Only elevated admins may list/download kigh-submission-media via '
  'the SDK. Public URL access continues to work via the storage CDN '
  '(bucket.public = true); the admin gallery-approval pipeline uses '
  '.download() and requires this policy (migration 054).';
