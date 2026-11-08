-- ============================================================
-- 092 — Gallery photos are for approved members (rows and files)
-- ============================================================
-- Problems:
--   1. Migration 076 let every signed-in account read every published
--      photo row. Anyone can sign up (the account gets a `pending`
--      members row, migration 028), so "members-only" meant "anyone
--      who registers". Other member features (community feed, 032)
--      already require an approved member: kigh_is_approved_member(),
--      i.e. members.membership_status = 'active'.
--   2. The files live in the public `gallery-public` bucket, so any
--      file URL loads for anyone, whatever the row rules say.
--
-- This migration (additive; the current app keeps working):
--   * Row SELECT for signed-in accounts: published photos that are
--     homepage-featured (anon already sees those), or all published
--     photos for approved members and elevated admins.
--   * Storage SELECT on `gallery-public` that mirrors the row rules,
--     so the app can sign file URLs for exactly what the viewer may see:
--       - anyone: published homepage-featured photos, and the single
--         cover file of each public album (migration 082);
--       - approved members and elevated admins: published photos.
--     Elevated admins keep full SELECT through migration 081.
--
-- Migration 093 then makes the bucket private, after the app that
-- signs URLs is live. Until 093 runs, files still load by public URL.
--
-- Rollback:
--   drop policy if exists "gallery_public_select_visible" on storage.objects;
--   and re-create migration 076's "Members can read published gallery images".
-- ============================================================

-- ─── 1. Row visibility for signed-in accounts ────────────────
drop policy if exists "Members can read published gallery images"
  on public.gallery_images;

create policy "Members can read published gallery images"
  on public.gallery_images for select
  to authenticated
  using (
    status = 'published'
    and (
      is_homepage_featured
      or public.kigh_is_approved_member()
      or public.kigh_is_elevated_admin()
    )
  );

comment on policy "Members can read published gallery images" on public.gallery_images is
  'Approved members (kigh_is_approved_member) and elevated admins read all published rows; '
  'other signed-in accounts read only homepage-featured rows, like anon (migration 092).';

-- ─── 2. Which gallery files may the caller read? ─────────────
create or replace function public.kigh_gallery_object_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.gallery_images gi
      where gi.status = 'published'
        and (
          gi.is_homepage_featured
          or public.kigh_is_approved_member()
          or public.kigh_is_elevated_admin()
        )
        and p_name in (
          substring(gi.image_url from '/gallery-public/([^?]+)'),
          substring(gi.thumbnail_url from '/gallery-public/([^?]+)')
        )
    )
    or exists (
      -- Only the one cover file of a public album, never its other photos.
      select 1
      from public.gallery_albums ga
      where coalesce(ga.visibility, 'public') = 'public'
        and substring(ga.cover_url from '/gallery-public/([^?]+)') = p_name
    );
$$;

revoke all on function public.kigh_gallery_object_readable(text) from public;
grant execute on function public.kigh_gallery_object_readable(text) to anon, authenticated;

comment on function public.kigh_gallery_object_readable(text) is
  'True when the caller may read this gallery-public object: homepage-featured photos and '
  'public album covers for anyone; all published photos for approved members and admins (092).';

-- ─── 3. Storage SELECT policy (signing a URL requires it) ────
drop policy if exists "gallery_public_select_visible" on storage.objects;
create policy "gallery_public_select_visible"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'gallery-public'
    and public.kigh_gallery_object_readable(name)
  );
