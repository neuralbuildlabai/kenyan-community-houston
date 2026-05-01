-- ============================================================
-- Admin password policy support: admin_user_profiles + view
-- ============================================================

-- Profiles (required by app AuthContext) — create if missing only.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'community_admin',
  phone text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles insert admin" on public.profiles;
create policy "profiles insert admin"
  on public.profiles for insert
  with check (public.is_admin());

-- ─── Admin security metadata (per auth user) ───────────────
create table if not exists public.admin_user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  must_change_password boolean not null default false,
  temporary_password_set_at timestamptz,
  password_changed_at timestamptz,
  display_name text,
  position_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists admin_user_profiles_updated_at on public.admin_user_profiles;
create trigger admin_user_profiles_updated_at
  before update on public.admin_user_profiles
  for each row execute function set_updated_at();

create index if not exists admin_user_profiles_password_changed_idx on public.admin_user_profiles (password_changed_at);

alter table public.admin_user_profiles enable row level security;

drop policy if exists "admin_user_profiles select" on public.admin_user_profiles;
create policy "admin_user_profiles select"
  on public.admin_user_profiles for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin_user_profiles insert" on public.admin_user_profiles;
create policy "admin_user_profiles insert"
  on public.admin_user_profiles for insert
  with check (public.is_admin());

drop policy if exists "admin_user_profiles update" on public.admin_user_profiles;
create policy "admin_user_profiles update"
  on public.admin_user_profiles for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ─── admin_users view (joins security metadata) ────────────
drop view if exists public.admin_users;

create or replace view public.admin_users as
select
  u.id,
  u.email,
  coalesce(nullif(trim(p.role), ''), nullif(trim(u.raw_user_meta_data->>'role'), ''), 'community_admin') as role,
  u.created_at,
  u.last_sign_in_at,
  coalesce(s.must_change_password, false) as must_change_password,
  s.temporary_password_set_at,
  s.password_changed_at,
  s.display_name,
  s.position_title
from auth.users u
left join public.profiles p on p.id = u.id
left join public.admin_user_profiles s on s.user_id = u.id;

grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.admin_user_profiles to authenticated;
grant select, insert, update on public.profiles to authenticated;

-- Backfill security rows for existing profiled admins (optional, non-destructive).
insert into public.admin_user_profiles (user_id, must_change_password, password_changed_at, display_name, position_title)
select
  p.id,
  false,
  coalesce(p.updated_at, p.created_at, now()),
  p.full_name,
  null
from public.profiles p
where p.role in (
  'super_admin',
  'community_admin',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer'
)
on conflict (user_id) do nothing;

-- Board pseudo accounts: when auth users exist, enforce first-login password change.
insert into public.admin_user_profiles (user_id, must_change_password, temporary_password_set_at, password_changed_at, display_name, position_title)
select u.id, true, now(), null, initcap(split_part(u.email, '@', 1)),
  case u.email
    when 'chair@kenyancommunityhouston.org' then 'Chair'
    when 'secretary@kenyancommunityhouston.org' then 'Secretary'
    when 'treasurer@kenyancommunityhouston.org' then 'Treasurer'
    else null
  end
from auth.users u
where u.email in (
  'chair@kenyancommunityhouston.org',
  'secretary@kenyancommunityhouston.org',
  'treasurer@kenyancommunityhouston.org'
)
on conflict (user_id) do update set
  must_change_password = true,
  temporary_password_set_at = coalesce(admin_user_profiles.temporary_password_set_at, excluded.temporary_password_set_at),
  password_changed_at = null,
  display_name = coalesce(excluded.display_name, admin_user_profiles.display_name),
  position_title = coalesce(excluded.position_title, admin_user_profiles.position_title),
  updated_at = now();

insert into public.profiles (id, email, full_name, role)
select u.id, u.email, initcap(split_part(u.email, '@', 1)), 'community_admin'
from auth.users u
where u.email in (
  'chair@kenyancommunityhouston.org',
  'secretary@kenyancommunityhouston.org',
  'treasurer@kenyancommunityhouston.org'
)
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, profiles.full_name),
  role = 'community_admin',
  updated_at = now();
