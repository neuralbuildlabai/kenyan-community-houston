-- ============================================================
-- 014 — Multi-community / multi-tenant foundation
-- ============================================================
-- Purpose
--   The platform will host multiple community organisations over
--   time (KIGH is the first/default tenant). This migration adds
--   the core tenant tables, seeds the default KIGH community,
--   adds nullable `community_id` foreign keys to the
--   public/admin tables that need tenant scoping, backfills the
--   default community on existing rows, and creates the
--   governance settings table for AGM/quorum.
--
-- Safety
--   - Idempotent.
--   - All new columns are NULLable and defaulted, so existing
--     frontend writes that omit `community_id` continue to work.
--   - Default community is fetched at runtime via
--     `public.kigh_default_community_id()`.

-- ─── communities ────────────────────────────────────────────
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  legal_name text,
  primary_domain text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended', 'archived')),
  timezone text not null default 'America/Chicago',
  contact_email text,
  contact_phone text,
  description text,
  brand_color text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communities_status_idx on public.communities (status);
create index if not exists communities_slug_idx on public.communities (slug);

drop trigger if exists communities_updated_at on public.communities;
create trigger communities_updated_at
  before update on public.communities
  for each row execute function public.set_updated_at();

alter table public.communities enable row level security;

drop policy if exists "communities select active" on public.communities;
create policy "communities select active"
  on public.communities for select
  using (status = 'active' or public.kigh_is_elevated_admin());

drop policy if exists "communities super admin all" on public.communities;
create policy "communities super admin all"
  on public.communities for all
  using (public.kigh_is_platform_super_admin())
  with check (public.kigh_is_platform_super_admin());

grant select on public.communities to anon, authenticated;
grant insert, update, delete on public.communities to authenticated;

-- ─── community_domains ──────────────────────────────────────
create table if not exists public.community_domains (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'failed', 'archived')),
  verification_token text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_domains_community_idx on public.community_domains (community_id);
create index if not exists community_domains_status_idx on public.community_domains (status);

drop trigger if exists community_domains_updated_at on public.community_domains;
create trigger community_domains_updated_at
  before update on public.community_domains
  for each row execute function public.set_updated_at();

alter table public.community_domains enable row level security;

drop policy if exists "community_domains select verified" on public.community_domains;
create policy "community_domains select verified"
  on public.community_domains for select
  using (status = 'verified' or public.kigh_is_elevated_admin());

drop policy if exists "community_domains super admin all" on public.community_domains;
create policy "community_domains super admin all"
  on public.community_domains for all
  using (public.kigh_is_platform_super_admin())
  with check (public.kigh_is_platform_super_admin());

grant select on public.community_domains to anon, authenticated;
grant insert, update, delete on public.community_domains to authenticated;

-- ─── community_admin_roles ──────────────────────────────────
-- Maps an auth user to a role within a specific community. A user
-- may hold roles in more than one community. `super_admin` here is
-- a community-scoped super admin (e.g. founder of that community);
-- platform-level super admins still come from `profiles.role`.
create table if not exists public.community_admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  role text not null
    check (role in (
      'super_admin',
      'community_admin',
      'admin',
      'content_manager',
      'membership_manager',
      'treasurer',
      'media_moderator',
      'ads_manager'
    )),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'revoked')),
  granted_by uuid references auth.users (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists community_admin_roles_unique
  on public.community_admin_roles (user_id, community_id, role);
create index if not exists community_admin_roles_user_idx
  on public.community_admin_roles (user_id);
create index if not exists community_admin_roles_community_idx
  on public.community_admin_roles (community_id);
create index if not exists community_admin_roles_status_idx
  on public.community_admin_roles (status);

drop trigger if exists community_admin_roles_updated_at on public.community_admin_roles;
create trigger community_admin_roles_updated_at
  before update on public.community_admin_roles
  for each row execute function public.set_updated_at();

alter table public.community_admin_roles enable row level security;

drop policy if exists "community_admin_roles read own or admin" on public.community_admin_roles;
create policy "community_admin_roles read own or admin"
  on public.community_admin_roles for select
  using (user_id = auth.uid() or public.kigh_is_elevated_admin());

drop policy if exists "community_admin_roles write super" on public.community_admin_roles;
create policy "community_admin_roles write super"
  on public.community_admin_roles for all
  using (public.kigh_is_platform_super_admin())
  with check (public.kigh_is_platform_super_admin());

grant select, insert, update, delete on public.community_admin_roles to authenticated;

-- ─── community_governance_settings ─────────────────────────
create table if not exists public.community_governance_settings (
  community_id uuid primary key references public.communities (id) on delete cascade,
  agm_month integer not null default 11
    check (agm_month between 1 and 12),
  quorum_percent numeric(5,2) not null default 25
    check (quorum_percent > 0 and quorum_percent <= 100),
  good_standing_grace_days integer not null default 30,
  membership_year_start_month integer not null default 1
    check (membership_year_start_month between 1 and 12),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists community_governance_settings_updated_at on public.community_governance_settings;
create trigger community_governance_settings_updated_at
  before update on public.community_governance_settings
  for each row execute function public.set_updated_at();

alter table public.community_governance_settings enable row level security;

drop policy if exists "governance public read" on public.community_governance_settings;
create policy "governance public read"
  on public.community_governance_settings for select
  using (true);

drop policy if exists "governance admin write" on public.community_governance_settings;
create policy "governance admin write"
  on public.community_governance_settings for all
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

grant select on public.community_governance_settings to anon, authenticated;
grant insert, update, delete on public.community_governance_settings to authenticated;

-- ─── Default community: KIGH ─────────────────────────────────
do $$
declare
  v_id uuid;
begin
  insert into public.communities (slug, name, legal_name, primary_domain, status, timezone, contact_email)
  values (
    'kigh',
    'Kenyan Community Houston',
    'Kenyans in Greater Houston',
    'kenyancommunityhouston.org',
    'active',
    'America/Chicago',
    'info@kenyancommunityhouston.com'
  )
  on conflict (slug) do update set
    name = excluded.name,
    legal_name = excluded.legal_name,
    primary_domain = excluded.primary_domain,
    timezone = excluded.timezone,
    contact_email = excluded.contact_email,
    updated_at = now()
  returning id into v_id;

  insert into public.community_domains (community_id, domain, is_primary, status, verified_at)
  values (v_id, 'kenyancommunityhouston.org', true, 'verified', now())
  on conflict (domain) do update set
    community_id = excluded.community_id,
    is_primary = excluded.is_primary,
    status = excluded.status,
    verified_at = coalesce(community_domains.verified_at, excluded.verified_at),
    updated_at = now();

  insert into public.community_governance_settings (community_id, agm_month, quorum_percent, good_standing_grace_days)
  values (v_id, 11, 25, 30)
  on conflict (community_id) do update set
    agm_month = excluded.agm_month,
    quorum_percent = excluded.quorum_percent,
    good_standing_grace_days = excluded.good_standing_grace_days,
    updated_at = now();
end $$;

-- ─── Default-community helper ───────────────────────────────
create or replace function public.kigh_default_community_id()
returns uuid
language sql
stable
as $$
  select id from public.communities where slug = 'kigh' limit 1;
$$;

revoke all on function public.kigh_default_community_id() from public;
grant execute on function public.kigh_default_community_id() to authenticated, anon;

-- ─── Add nullable community_id to scoped tables ─────────────
-- Public content tables (community_id nullable, defaulted).
alter table public.events             add column if not exists community_id uuid references public.communities (id);
alter table public.announcements      add column if not exists community_id uuid references public.communities (id);
alter table public.businesses         add column if not exists community_id uuid references public.communities (id);
alter table public.fundraisers        add column if not exists community_id uuid references public.communities (id);
alter table public.sports_posts       add column if not exists community_id uuid references public.communities (id);
alter table public.gallery_albums     add column if not exists community_id uuid references public.communities (id);
alter table public.gallery_images     add column if not exists community_id uuid references public.communities (id);
alter table public.contact_submissions add column if not exists community_id uuid references public.communities (id);
alter table public.members            add column if not exists community_id uuid references public.communities (id);
alter table public.household_members  add column if not exists community_id uuid references public.communities (id);
alter table public.membership_payments add column if not exists community_id uuid references public.communities (id);
alter table public.resources          add column if not exists community_id uuid references public.communities (id);
alter table public.community_groups   add column if not exists community_id uuid references public.communities (id);
alter table public.service_interests  add column if not exists community_id uuid references public.communities (id);
alter table public.profiles           add column if not exists community_id uuid references public.communities (id);

-- Backfill existing rows with the default KIGH community.
do $$
declare
  v_default uuid := public.kigh_default_community_id();
begin
  if v_default is null then
    return;
  end if;
  update public.events             set community_id = v_default where community_id is null;
  update public.announcements      set community_id = v_default where community_id is null;
  update public.businesses         set community_id = v_default where community_id is null;
  update public.fundraisers        set community_id = v_default where community_id is null;
  update public.sports_posts       set community_id = v_default where community_id is null;
  update public.gallery_albums     set community_id = v_default where community_id is null;
  update public.gallery_images     set community_id = v_default where community_id is null;
  update public.contact_submissions set community_id = v_default where community_id is null;
  update public.members            set community_id = v_default where community_id is null;
  update public.household_members  set community_id = v_default where community_id is null;
  update public.membership_payments set community_id = v_default where community_id is null;
  update public.resources          set community_id = v_default where community_id is null;
  update public.community_groups   set community_id = v_default where community_id is null;
  update public.service_interests  set community_id = v_default where community_id is null;
  update public.profiles           set community_id = v_default where community_id is null;
end $$;

-- Default to KIGH for new rows that omit community_id.
alter table public.events             alter column community_id set default public.kigh_default_community_id();
alter table public.announcements      alter column community_id set default public.kigh_default_community_id();
alter table public.businesses         alter column community_id set default public.kigh_default_community_id();
alter table public.fundraisers        alter column community_id set default public.kigh_default_community_id();
alter table public.sports_posts       alter column community_id set default public.kigh_default_community_id();
alter table public.gallery_albums     alter column community_id set default public.kigh_default_community_id();
alter table public.gallery_images     alter column community_id set default public.kigh_default_community_id();
alter table public.contact_submissions alter column community_id set default public.kigh_default_community_id();
alter table public.members            alter column community_id set default public.kigh_default_community_id();
alter table public.household_members  alter column community_id set default public.kigh_default_community_id();
alter table public.membership_payments alter column community_id set default public.kigh_default_community_id();
alter table public.resources          alter column community_id set default public.kigh_default_community_id();
alter table public.community_groups   alter column community_id set default public.kigh_default_community_id();
alter table public.service_interests  alter column community_id set default public.kigh_default_community_id();
alter table public.profiles           alter column community_id set default public.kigh_default_community_id();

-- Indexes for tenant-scoped queries.
create index if not exists events_community_idx             on public.events (community_id);
create index if not exists announcements_community_idx      on public.announcements (community_id);
create index if not exists businesses_community_idx         on public.businesses (community_id);
create index if not exists fundraisers_community_idx        on public.fundraisers (community_id);
create index if not exists sports_posts_community_idx       on public.sports_posts (community_id);
create index if not exists gallery_albums_community_idx     on public.gallery_albums (community_id);
create index if not exists gallery_images_community_idx     on public.gallery_images (community_id);
create index if not exists contact_submissions_community_idx on public.contact_submissions (community_id);
create index if not exists members_community_idx            on public.members (community_id);
create index if not exists household_members_community_idx  on public.household_members (community_id);
create index if not exists membership_payments_community_idx on public.membership_payments (community_id);
create index if not exists resources_community_idx          on public.resources (community_id);
create index if not exists community_groups_community_idx   on public.community_groups (community_id);
create index if not exists service_interests_community_idx  on public.service_interests (community_id);
create index if not exists profiles_community_idx           on public.profiles (community_id);
