-- ============================================================
-- 082 — One public cover image per gallery album
-- ============================================================
-- Logged-out visitors may see each public album's single cover.
-- The rest of the album stays members-only (migration 076): anon
-- still cannot list published gallery_images except homepage
-- features. Cover files already live in the public gallery bucket,
-- so exposing cover_url on the album is enough to show that image.
--
-- Albums that already have published photos but no cover get the
-- earliest published photo as the cover. Later publishes keep an
-- existing cover when it still matches a published photo, and pick
-- a replacement when it does not.

-- ─── 1. Keep exactly one cover as photos change ─────────────
create or replace function public.kigh_ensure_gallery_album_cover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[] := array[]::uuid[];
  v_album uuid;
  v_cover text;
  v_current text;
begin
  if tg_op is null then
    raise exception 'forbidden';
  end if;

  if tg_op = 'DELETE' then
    v_ids := array[old.album_id];
  elsif tg_op = 'UPDATE' then
    v_ids := array[new.album_id, old.album_id];
  else
    v_ids := array[new.album_id];
  end if;

  foreach v_album in array v_ids loop
    if v_album is null then
      continue;
    end if;

    select ga.cover_url into v_current
    from public.gallery_albums ga
    where ga.id = v_album;

    if nullif(btrim(v_current), '') is not null and exists (
      select 1
      from public.gallery_images gi
      where gi.album_id = v_album
        and gi.status = 'published'
        and v_current in (gi.thumbnail_url, gi.image_url)
    ) then
      continue;
    end if;

    select coalesce(nullif(btrim(gi.thumbnail_url), ''), nullif(btrim(gi.image_url), ''))
      into v_cover
    from public.gallery_images gi
    where gi.album_id = v_album
      and gi.status = 'published'
      and coalesce(nullif(btrim(gi.thumbnail_url), ''), nullif(btrim(gi.image_url), '')) is not null
    order by gi.sort_order asc, gi.created_at asc
    limit 1;

    update public.gallery_albums
    set cover_url = v_cover
    where id = v_album
      and cover_url is distinct from v_cover;
  end loop;

  return null;
end;
$$;

comment on function public.kigh_ensure_gallery_album_cover() is
  'Keeps gallery_albums.cover_url pointed at one published photo. '
  'Does not expose other photos to anonymous callers (migration 082).';

revoke all on function public.kigh_ensure_gallery_album_cover() from public;
revoke all on function public.kigh_ensure_gallery_album_cover() from anon;
revoke all on function public.kigh_ensure_gallery_album_cover() from authenticated;
grant execute on function public.kigh_ensure_gallery_album_cover() to anon, authenticated;

drop trigger if exists gallery_images_ensure_album_cover on public.gallery_images;
create trigger gallery_images_ensure_album_cover
  after insert or update or delete on public.gallery_images
  for each row execute function public.kigh_ensure_gallery_album_cover();

-- ─── 2. Backfill albums that have photos and no cover ───────
update public.gallery_albums ga
set cover_url = sub.cover
from (
  select distinct on (gi.album_id)
    gi.album_id,
    coalesce(nullif(btrim(gi.thumbnail_url), ''), nullif(btrim(gi.image_url), '')) as cover
  from public.gallery_images gi
  where gi.status = 'published'
    and gi.album_id is not null
    and coalesce(nullif(btrim(gi.thumbnail_url), ''), nullif(btrim(gi.image_url), '')) is not null
  order by gi.album_id, gi.sort_order asc, gi.created_at asc
) sub
where ga.id = sub.album_id
  and nullif(btrim(ga.cover_url), '') is null;

-- ─── 3. Anonymous callers can see an album once it has a cover
-- The public view is security_invoker. Its old EXISTS only saw
-- rows the caller can read, so after migration 076 an anonymous
-- visitor could not see albums whose photos were not homepage
-- features. A cover URL is not a photo list.
create or replace view public.gallery_albums_public as
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
      or nullif(btrim(ga.cover_url), '') is not null
      or exists (
        select 1
        from public.gallery_images_public gip
        where gip.album_id = ga.id
      )
    );

alter view public.gallery_albums_public set (security_invoker = on);

comment on view public.gallery_albums_public is
  'Public-safe gallery albums. Anonymous visitors can read the cover, '
  'not the rest of the album (migration 082).';

grant select on public.gallery_albums_public to anon, authenticated;

drop policy if exists "Public can read gallery albums" on public.gallery_albums;

create policy "Public can read gallery albums"
  on public.gallery_albums for select
  using (
    coalesce(visibility, 'public') = 'public'
    and (
      open_for_submissions = true
      or nullif(btrim(cover_url), '') is not null
      or exists (
        select 1
        from public.gallery_images_public gip
        where gip.album_id = gallery_albums.id
      )
    )
  );

comment on policy "Public can read gallery albums" on public.gallery_albums is
  'Public may read public albums that accept submissions, have a cover, '
  'or have images the caller can already see (migration 082).';
