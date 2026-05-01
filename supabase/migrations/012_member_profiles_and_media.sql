-- ============================================================
-- Member profiles extension, profile household, media submissions,
-- private storage buckets, and elevated-admin helper for RLS.
-- Does not modify existing is_admin() or weaken existing policies.
-- ============================================================

-- True only for board/admin roles in profiles (not arbitrary authenticated users).
create or replace function public.kigh_is_elevated_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(trim(p.role), '') in (
        'super_admin',
        'community_admin',
        'business_admin',
        'support_admin',
        'moderator',
        'viewer'
      )
  );
$$;

revoke all on function public.kigh_is_elevated_admin() from public;
grant execute on function public.kigh_is_elevated_admin() to authenticated, anon;

-- ─── Extend profiles (member-facing fields) ─────────────────
alter table public.profiles add column if not exists preferred_name text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists zip_code text;
alter table public.profiles add column if not exists county_or_heritage text;
alter table public.profiles add column if not exists preferred_communication text;
alter table public.profiles add column if not exists occupation text;
alter table public.profiles add column if not exists business_or_profession text;
alter table public.profiles add column if not exists emergency_contact_name text;
alter table public.profiles add column if not exists emergency_contact_phone text;
alter table public.profiles add column if not exists interests text[] not null default '{}'::text[];
alter table public.profiles add column if not exists willing_to_volunteer boolean not null default false;
alter table public.profiles add column if not exists willing_to_serve boolean not null default false;
alter table public.profiles add column if not exists volunteer_interests text[] not null default '{}'::text[];
alter table public.profiles add column if not exists service_notes text;
alter table public.profiles add column if not exists avatar_storage_bucket text;
alter table public.profiles add column if not exists avatar_storage_path text;
alter table public.profiles add column if not exists avatar_original_filename text;
alter table public.profiles add column if not exists avatar_mime_type text;
alter table public.profiles add column if not exists avatar_file_size bigint;
alter table public.profiles add column if not exists profile_visibility text not null default 'private';

alter table public.profiles drop constraint if exists profiles_profile_visibility_check;
alter table public.profiles add constraint profiles_profile_visibility_check
  check (profile_visibility in ('private', 'members_only', 'public'));

-- ─── Membership registrations: serve flags (admin reporting) ─
alter table public.members add column if not exists willing_to_volunteer boolean not null default false;
alter table public.members add column if not exists willing_to_serve boolean not null default false;

-- ─── Profile household (auth user scoped; not public membership rows) ─
create table if not exists public.profile_household_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  relationship text,
  age_group text check (age_group is null or age_group in ('adult', 'youth', 'child')),
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_household_members_user_id_idx
  on public.profile_household_members (user_id);

drop trigger if exists profile_household_members_updated_at on public.profile_household_members;
create trigger profile_household_members_updated_at
  before update on public.profile_household_members
  for each row execute function public.set_updated_at();

alter table public.profile_household_members enable row level security;

drop policy if exists "profile_household select own or elevated admin" on public.profile_household_members;
create policy "profile_household select own or elevated admin"
  on public.profile_household_members for select
  using (user_id = auth.uid() or public.kigh_is_elevated_admin());

drop policy if exists "profile_household insert own" on public.profile_household_members;
create policy "profile_household insert own"
  on public.profile_household_members for insert
  with check (user_id = auth.uid());

drop policy if exists "profile_household update own or elevated admin" on public.profile_household_members;
create policy "profile_household update own or elevated admin"
  on public.profile_household_members for update
  using (user_id = auth.uid() or public.kigh_is_elevated_admin())
  with check (user_id = auth.uid() or public.kigh_is_elevated_admin());

drop policy if exists "profile_household delete own or elevated admin" on public.profile_household_members;
create policy "profile_household delete own or elevated admin"
  on public.profile_household_members for delete
  using (user_id = auth.uid() or public.kigh_is_elevated_admin());

grant select, insert, update, delete on public.profile_household_members to authenticated;

-- ─── Member media submissions (pending review; not public) ──
create table if not exists public.member_media_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  media_type text not null check (media_type in ('image', 'video')),
  storage_bucket text not null,
  storage_path text not null,
  original_filename text,
  mime_type text,
  file_size bigint,
  event_id uuid references public.events (id) on delete set null,
  permission_to_use boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_media_submissions_user_id_idx
  on public.member_media_submissions (user_id);
create index if not exists member_media_submissions_status_idx
  on public.member_media_submissions (status);

drop trigger if exists member_media_submissions_updated_at on public.member_media_submissions;
create trigger member_media_submissions_updated_at
  before update on public.member_media_submissions
  for each row execute function public.set_updated_at();

alter table public.member_media_submissions enable row level security;

drop policy if exists "mms select own or elevated admin" on public.member_media_submissions;
create policy "mms select own or elevated admin"
  on public.member_media_submissions for select
  using (user_id = auth.uid() or public.kigh_is_elevated_admin());

drop policy if exists "mms insert own" on public.member_media_submissions;
create policy "mms insert own"
  on public.member_media_submissions for insert
  with check (user_id = auth.uid());

drop policy if exists "mms update own pending" on public.member_media_submissions;
create policy "mms update own pending"
  on public.member_media_submissions for update
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "mms elevated admin update" on public.member_media_submissions;
create policy "mms elevated admin update"
  on public.member_media_submissions for update
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

drop policy if exists "mms elevated admin delete" on public.member_media_submissions;
create policy "mms elevated admin delete"
  on public.member_media_submissions for delete
  using (public.kigh_is_elevated_admin());

grant select, insert, update, delete on public.member_media_submissions to authenticated;

-- ─── Storage buckets (private) ───────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('kigh-member-media', 'kigh-member-media', false, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

insert into storage.buckets (id, name, public, file_size_limit)
values ('kigh-gallery-submissions', 'kigh-gallery-submissions', false, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- kigh-member-media: first path segment must equal auth.uid()
drop policy if exists "kigh_member_media select own or admin" on storage.objects;
create policy "kigh_member_media select own or admin"
  on storage.objects for select
  using (
    bucket_id = 'kigh-member-media'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  );

drop policy if exists "kigh_member_media insert own" on storage.objects;
create policy "kigh_member_media insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'kigh-member-media'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "kigh_member_media update own or admin" on storage.objects;
create policy "kigh_member_media update own or admin"
  on storage.objects for update
  using (
    bucket_id = 'kigh-member-media'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  )
  with check (
    bucket_id = 'kigh-member-media'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  );

drop policy if exists "kigh_member_media delete own or admin" on storage.objects;
create policy "kigh_member_media delete own or admin"
  on storage.objects for delete
  using (
    bucket_id = 'kigh-member-media'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  );

-- kigh-gallery-submissions: same path convention
drop policy if exists "kigh_gallery_sub select own or admin" on storage.objects;
create policy "kigh_gallery_sub select own or admin"
  on storage.objects for select
  using (
    bucket_id = 'kigh-gallery-submissions'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  );

drop policy if exists "kigh_gallery_sub insert own" on storage.objects;
create policy "kigh_gallery_sub insert own"
  on storage.objects for insert
  with check (
    bucket_id = 'kigh-gallery-submissions'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "kigh_gallery_sub update own or admin" on storage.objects;
create policy "kigh_gallery_sub update own or admin"
  on storage.objects for update
  using (
    bucket_id = 'kigh-gallery-submissions'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  )
  with check (
    bucket_id = 'kigh-gallery-submissions'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  );

drop policy if exists "kigh_gallery_sub delete own or admin" on storage.objects;
create policy "kigh_gallery_sub delete own or admin"
  on storage.objects for delete
  using (
    bucket_id = 'kigh-gallery-submissions'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.kigh_is_elevated_admin()
    )
  );
