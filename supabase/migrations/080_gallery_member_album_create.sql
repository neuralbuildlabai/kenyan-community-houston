-- ============================================================
-- 080 — Create a gallery album while submitting photos
-- ============================================================
-- Signed-in members can name a new album (optional description)
-- from /gallery/submit and attach pending photos to it. The album
-- stays out of the public submit list until an admin opens it or
-- publishes photos into it (existing gallery_albums_public rule).
--
-- Admins keep creating albums directly. This migration only adds
-- the member RPC path plus a list of albums the caller created,
-- so they can add more photos after a reload.
--
-- Creation goes through SECURITY DEFINER RPCs so members cannot
-- insert arbitrary album columns (visibility, open_for_submissions).
-- Idempotent.

-- ─── 1. Who created the album ───────────────────────────────
alter table public.gallery_albums
  add column if not exists created_by uuid references auth.users (id) on delete set null;

comment on column public.gallery_albums.created_by is
  'Auth user who created the album. Null for albums created before member album creation (migration 080).';

create index if not exists gallery_albums_created_by_idx
  on public.gallery_albums (created_by)
  where created_by is not null;

-- Hide the creator id from API roles. RLS and security-definer
-- functions still see the column. Table-level SELECT already
-- exists for anon and authenticated (migration 043).
revoke select (created_by) on public.gallery_albums from anon, authenticated;

-- ─── 2. Create an album as the signed-in member ─────────────
create or replace function public.kigh_create_member_gallery_album(
  p_name text,
  p_description text default null
)
returns table (id uuid, name text, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_base text;
  v_slug text;
  v_id uuid;
  v_n int := 1;
begin
  if v_uid is null then
    raise exception 'Sign in to create an album.' using errcode = 'P0001';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Album name must be between 2 and 80 characters.' using errcode = 'P0001';
  end if;

  if v_description is not null and char_length(v_description) > 500 then
    raise exception 'Album description must be 500 characters or fewer.' using errcode = 'P0001';
  end if;

  if public.kigh_contains_blocked_language(v_name)
    or (v_description is not null and public.kigh_contains_blocked_language(v_description)) then
    raise exception 'Please choose a different album name or description.' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.gallery_albums ga
    where ga.created_by = v_uid
      and ga.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'You have created too many albums today. Try again tomorrow.' using errcode = 'P0001';
  end if;

  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_base is null or v_base = '' then
    v_base := 'album';
  end if;

  v_slug := v_base;
  while exists (select 1 from public.gallery_albums ga where ga.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
    if v_n > 50 then
      raise exception 'Could not create a unique album address.' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.gallery_albums (
    name,
    slug,
    description,
    visibility,
    open_for_submissions,
    created_by
  ) values (
    v_name,
    v_slug,
    v_description,
    'public',
    false,
    v_uid
  )
  returning gallery_albums.id into v_id;

  return query
  select ga.id, ga.name, ga.slug
  from public.gallery_albums ga
  where ga.id = v_id;
end;
$$;

comment on function public.kigh_create_member_gallery_album(text, text) is
  'Signed-in members create a gallery album (name + optional description). Photos stay pending until an admin publishes them. The album is not open for public submissions until an admin opts in (migration 080).';

revoke all on function public.kigh_create_member_gallery_album(text, text) from public;
revoke execute on function public.kigh_create_member_gallery_album(text, text) from anon;
grant execute on function public.kigh_create_member_gallery_album(text, text) to authenticated;

-- ─── 3. Albums the caller created (including not-yet-public) ─
create or replace function public.kigh_list_my_gallery_albums()
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ga.id, ga.name, ga.slug, ga.description, ga.created_at
  from public.gallery_albums ga
  where ga.created_by = auth.uid()
  order by ga.name;
$$;

comment on function public.kigh_list_my_gallery_albums() is
  'Albums created by the signed-in user, including ones not yet on the public submit list (migration 080).';

revoke all on function public.kigh_list_my_gallery_albums() from public;
revoke execute on function public.kigh_list_my_gallery_albums() from anon;
grant execute on function public.kigh_list_my_gallery_albums() to authenticated;
