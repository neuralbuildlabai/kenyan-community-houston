-- ============================================================
-- 029 — Public gallery album metadata: do not expose empty/draft albums
-- ============================================================
-- Previously, `gallery_albums` allowed anon SELECT with `using (true)`,
-- so album titles/slugs were visible even when every image was still
-- `pending`. Align anon access with what the public site shows: albums
-- that contain at least one published image.

drop policy if exists "Public can read gallery albums" on public.gallery_albums;

create policy "Public can read gallery albums"
  on public.gallery_albums for select
  using (
    exists (
      select 1
      from public.gallery_images gi
      where gi.album_id = gallery_albums.id
        and gi.status = 'published'
    )
  );

comment on policy "Public can read gallery albums" on public.gallery_albums is
  'Anonymous/public may only read album rows that already have published images (migration 029).';
