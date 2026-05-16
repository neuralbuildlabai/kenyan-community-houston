-- ============================================================
-- 038 — Gallery albums public view (fix anon album SELECT after 036)
-- ============================================================
-- Problem:
--   Migration 036 revoked anon SELECT on gallery_images. The
--   gallery_albums RLS policy (029/035) uses EXISTS against
--   gallery_images, which causes "permission denied for table
--   gallery_images" for anon/authenticated public callers.
--
-- Fix:
--   1. Public-safe view gallery_albums_public that references
--      gallery_images_public (which anon may read).
--   2. Rewrite the album SELECT policy to use the public view.
--   3. Grant SELECT on the view to anon and authenticated.

drop view if exists public.gallery_albums_public;

create view public.gallery_albums_public as
  select
    ga.id,
    ga.name,
    ga.slug,
    ga.description,
    ga.cover_url,
    ga.created_at,
    ga.event_date,
    ga.open_for_submissions
  from public.gallery_albums ga
  where coalesce(ga.visibility, 'public') = 'public'
    and (
      ga.open_for_submissions = true
      or exists (
        select 1
        from public.gallery_images_public gip
        where gip.album_id = ga.id
      )
    );

comment on view public.gallery_albums_public is
  'Public-safe gallery albums: public visibility, open for submissions or has published images (migration 038).';

grant select on public.gallery_albums_public to anon, authenticated;

-- Rewrite album RLS so policy checks do not touch gallery_images directly.
drop policy if exists "Public can read gallery albums" on public.gallery_albums;

create policy "Public can read gallery albums"
  on public.gallery_albums for select
  using (
    coalesce(visibility, 'public') = 'public'
    and (
      open_for_submissions = true
      or exists (
        select 1
        from public.gallery_images_public gip
        where gip.album_id = gallery_albums.id
      )
    )
  );

comment on policy "Public can read gallery albums" on public.gallery_albums is
  'Public may read public albums that accept submissions or have published images; EXISTS uses gallery_images_public (migration 038).';
