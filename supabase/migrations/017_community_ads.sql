-- ============================================================
-- 017 — Community advertisements / sponsorship
-- ============================================================
-- Allows community admins (or ads_manager) to manage sponsor /
-- advertisement slots for their community. Public users only see
-- approved + active + currently-in-window ads.

create table if not exists public.community_ads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade
    default public.kigh_default_community_id(),
  title text not null,
  description text,
  sponsor_name text,
  sponsor_url text,
  image_url text,
  target_url text,
  placement text not null
    check (placement in (
      'homepage_hero',
      'homepage_sidebar',
      'events_sidebar',
      'business_directory',
      'footer',
      'gallery_sidebar'
    )),
  status text not null default 'pending_review'
    check (status in ('draft','pending_review','approved','rejected','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer not null default 0,
  click_count bigint not null default 0,
  impression_count bigint not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_ads_community_idx on public.community_ads (community_id);
create index if not exists community_ads_status_idx on public.community_ads (status);
create index if not exists community_ads_placement_idx on public.community_ads (placement);
create index if not exists community_ads_window_idx on public.community_ads (starts_at, ends_at);
create index if not exists community_ads_priority_idx on public.community_ads (priority desc);

drop trigger if exists community_ads_updated_at on public.community_ads;
create trigger community_ads_updated_at
  before update on public.community_ads
  for each row execute function public.set_updated_at();

alter table public.community_ads enable row level security;

-- Public reads: only approved + within window. No client-side ability
-- to read drafts or rejected entries.
drop policy if exists "ads public select approved" on public.community_ads;
create policy "ads public select approved"
  on public.community_ads for select
  using (
    status = 'approved'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

-- Admins can read everything in their scope.
drop policy if exists "ads admin select all" on public.community_ads;
create policy "ads admin select all"
  on public.community_ads for select
  using (public.kigh_is_elevated_admin());

-- Submit/insert: ads_manager / community_admin / super_admin may create
-- in their community (or any if super_admin).
drop policy if exists "ads admin insert" on public.community_ads;
create policy "ads admin insert"
  on public.community_ads for insert
  with check (
    public.kigh_has_community_role(
      array['super_admin','community_admin','admin','ads_manager'],
      community_id
    )
  );

drop policy if exists "ads admin update" on public.community_ads;
create policy "ads admin update"
  on public.community_ads for update
  using (
    public.kigh_has_community_role(
      array['super_admin','community_admin','admin','ads_manager'],
      community_id
    )
  )
  with check (
    public.kigh_has_community_role(
      array['super_admin','community_admin','admin','ads_manager'],
      community_id
    )
  );

drop policy if exists "ads admin delete" on public.community_ads;
create policy "ads admin delete"
  on public.community_ads for delete
  using (
    public.kigh_has_community_role(
      array['super_admin','community_admin','admin','ads_manager'],
      community_id
    )
  );

grant select on public.community_ads to anon, authenticated;
grant insert, update, delete on public.community_ads to authenticated;

-- ─── Public listing helper ─────────────────────────────────
-- Convenience function used by the frontend; centralises the
-- approved-and-in-window predicate, sorts by priority+recency.
create or replace function public.list_active_community_ads(
  p_placement text default null,
  p_community_id uuid default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  community_id uuid,
  title text,
  description text,
  sponsor_name text,
  sponsor_url text,
  image_url text,
  target_url text,
  placement text,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.community_id,
    a.title,
    a.description,
    a.sponsor_name,
    a.sponsor_url,
    a.image_url,
    a.target_url,
    a.placement,
    a.starts_at,
    a.ends_at,
    a.priority
  from public.community_ads a
  where a.status = 'approved'
    and (a.starts_at is null or a.starts_at <= now())
    and (a.ends_at is null or a.ends_at >= now())
    and (p_placement is null or a.placement = p_placement)
    and (
      p_community_id is null
      or a.community_id = p_community_id
      or a.community_id = public.kigh_default_community_id()
    )
  order by a.priority desc, a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

revoke all on function public.list_active_community_ads(text, uuid, integer) from public;
grant execute on function public.list_active_community_ads(text, uuid, integer) to anon, authenticated;
