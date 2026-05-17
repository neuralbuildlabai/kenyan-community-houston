-- ============================================================
-- 045 — Leadership seats (admin-editable roster) + photo bucket
-- ============================================================
-- Adds a small CMS table behind the public /leadership page so
-- elevated admins can add, edit, reorder, and delete seats from
-- the admin UI without a code push.
--
-- Seeded with the current interim roster (sourced from
-- `src/data/leadership.ts` and the KIGH Virtual Meet & Greet deck).
-- The static array stays in the codebase as a hard-coded fallback;
-- the frontend prefers DB rows whenever they're present.
--
-- Storage
--   * Bucket `leadership-photos` (public-read, admin-write) for headshots.
--   * Each row stores both the storage path (for cleanup on delete /
--     replace) and the public URL (for fast page render).
--
-- Permissions
--   * SELECT on active rows: anon + authenticated.
--   * INSERT / UPDATE / DELETE: elevated admins only.
--   * `kigh_is_elevated_admin()` already grants access to:
--       super_admin, platform_admin, community_admin, content_manager,
--       membership_manager, treasurer, media_moderator, ads_manager,
--       and the legacy business_admin / support_admin / moderator.
-- ============================================================

-- ─── 1. Table ───────────────────────────────────────────────
-- Per-element validation of the `titles` array. CHECK constraints cannot
-- contain subqueries, so we wrap the per-element predicate in an IMMUTABLE
-- function and call it from the constraint. Returns true for empty arrays;
-- the separate `_titles_nonempty` constraint enforces non-emptiness so we
-- get a clearer error on that path.
create or replace function public.kigh_leadership_titles_ok(t text[])
returns boolean
language sql
immutable
as $$
  select coalesce(
    bool_and(char_length(coalesce(x, '')) between 1 and 120),
    true
  )
  from unnest(t) as x;
$$;

create table if not exists public.leadership_seats (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text,
  titles text[] not null default '{}'::text[],
  seat_group text not null,
  photo_url text,
  photo_storage_path text,
  blurb text,
  display_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leadership_seats_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  constraint leadership_seats_titles_nonempty check (array_length(titles, 1) >= 1),
  constraint leadership_seats_titles_short check (public.kigh_leadership_titles_ok(titles)),
  constraint leadership_seats_group_allowed check (
    seat_group in (
      'executive',
      'treasury',
      'operations',
      'community_welfare',
      'youth',
      'secretariat'
    )
  ),
  constraint leadership_seats_blurb_len check (blurb is null or char_length(blurb) <= 600),
  constraint leadership_seats_name_len check (name is null or (char_length(trim(name)) between 1 and 120))
);

comment on table public.leadership_seats is
  'Editable roster of community leadership seats rendered on /leadership. NULL `name` means the seat is vacant. See migration 045.';
comment on column public.leadership_seats.titles is
  'Array of role titles for the seat; rendered one per line. e.g. [''Vice President'', ''Acting Treasurer''].';
comment on column public.leadership_seats.seat_group is
  'Functional grouping: executive | treasury | operations | community_welfare | youth | secretariat.';
comment on column public.leadership_seats.photo_url is
  'Public URL (Supabase Storage signed-bucket URL) used directly by the frontend `<img>`.';
comment on column public.leadership_seats.photo_storage_path is
  'Object path inside the `leadership-photos` bucket. Used by the admin UI to delete the old object when a photo is replaced.';
comment on column public.leadership_seats.display_order is
  'Lower values render first within a group. Tiebreaker is created_at asc.';
comment on column public.leadership_seats.is_active is
  'When false, the row is hidden from /leadership but kept for history.';

create index if not exists leadership_seats_group_order_idx
  on public.leadership_seats (seat_group, display_order, created_at);
create index if not exists leadership_seats_active_idx
  on public.leadership_seats (is_active);

-- ─── 2. updated_at trigger ──────────────────────────────────
drop trigger if exists leadership_seats_updated_at on public.leadership_seats;
create trigger leadership_seats_updated_at
  before update on public.leadership_seats
  for each row execute function public.set_updated_at();

-- ─── 3. RLS ─────────────────────────────────────────────────
alter table public.leadership_seats enable row level security;

drop policy if exists "leadership_seats public select active" on public.leadership_seats;
create policy "leadership_seats public select active"
  on public.leadership_seats for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "leadership_seats elevated admin select all" on public.leadership_seats;
create policy "leadership_seats elevated admin select all"
  on public.leadership_seats for select
  to authenticated
  using (public.kigh_is_elevated_admin());

drop policy if exists "leadership_seats elevated admin write" on public.leadership_seats;
create policy "leadership_seats elevated admin write"
  on public.leadership_seats for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── 4. Table grants ────────────────────────────────────────
grant select on public.leadership_seats to anon, authenticated;
grant insert, update, delete on public.leadership_seats to authenticated;

-- ─── 5. Storage bucket: leadership-photos ───────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leadership-photos',
  'leadership-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies — public read, admin-only writes.
drop policy if exists "leadership_photos public read" on storage.objects;
create policy "leadership_photos public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'leadership-photos');

drop policy if exists "leadership_photos admin insert" on storage.objects;
create policy "leadership_photos admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'leadership-photos' and public.kigh_is_elevated_admin());

drop policy if exists "leadership_photos admin update" on storage.objects;
create policy "leadership_photos admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'leadership-photos' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'leadership-photos' and public.kigh_is_elevated_admin());

drop policy if exists "leadership_photos admin delete" on storage.objects;
create policy "leadership_photos admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'leadership-photos' and public.kigh_is_elevated_admin());

-- ─── 6. Seed initial interim roster ─────────────────────────
-- Idempotent: `on conflict (slug) do nothing` so re-running this migration
-- does not overwrite admin edits. To reseed cleanly, truncate first.
insert into public.leadership_seats (slug, name, titles, seat_group, photo_url, display_order)
values
  ('brenda-kariuki',                  'Brenda Kariuki',     array['President / Chairperson'],                              'executive',         '/team/brenda-kariuki.jpg',     10),
  ('patrick-gitu',                    'Patrick Gitu',       array['Vice President', 'Acting Treasurer'],                   'executive',         '/team/patrick-gitu.jpg',       20),
  ('treasurer-co-lead-vacant',        null,                  array['Treasurer Co-Lead'],                                    'treasury',          null,                            10),
  ('godfrey-maseno',                  'Godfrey Maseno',     array['Operations / Facilitators Co-Lead'],                    'operations',        '/team/godfrey-maseno.jpg',     10),
  ('laureen-murangiri',               'Laureen Murangiri',  array['Operations / Facilitators'],                            'operations',        '/team/laureen-murangiri.jpg',  20),
  ('beverly-sande',                   'Dr. Beverly Sande',  array['Community Welfare Lead'],                               'community_welfare', '/team/beverly-sande.jpg',      10),
  ('community-welfare-co-lead-vacant', null,                  array['Community Welfare Co-Lead'],                            'community_welfare', null,                            20),
  ('michelle-mwaura',                 'Michelle Mwaura',    array['Youth Representative'],                                 'youth',             '/team/michelle-mwaura.jpg',    10),
  ('youth-rep-co-lead-vacant',        null,                  array['Youth Representative (Co-Lead)'],                       'youth',             null,                            20),
  ('secretary-vacant',                null,                  array['Secretary'],                                            'secretariat',       null,                            10),
  ('co-secretary-vacant',             null,                  array['Co-Secretary'],                                         'secretariat',       null,                            20)
on conflict (slug) do nothing;
