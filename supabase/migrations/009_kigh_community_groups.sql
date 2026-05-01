-- ============================================================
-- Community groups & institutions (non-commercial directory)
-- Public reads via RPC only (no submitter PII / notes exposure).
-- ============================================================

create table if not exists community_groups (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  slug text not null unique,
  category text not null
    check (category in (
      'religious_institution',
      'benevolence_group',
      'welfare_group',
      'youth_family_group',
      'cultural_organization',
      'professional_networking_group',
      'other'
    )),
  description text,
  website_url text,
  public_email text,
  public_phone text,
  meeting_location text,
  service_area text,
  social_url text,
  contact_person text,
  submitter_name text not null,
  submitter_email text not null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'published', 'rejected', 'archived')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_groups_status_idx on community_groups (status);
create index if not exists community_groups_category_idx on community_groups (category);
create index if not exists community_groups_slug_idx on community_groups (slug);
create index if not exists community_groups_org_name_idx on community_groups (organization_name);

drop trigger if exists community_groups_updated_at on community_groups;
create trigger community_groups_updated_at
  before update on community_groups
  for each row execute function set_updated_at();

alter table community_groups enable row level security;

create policy "Admins full access community_groups"
  on community_groups for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public insert community_groups pending"
  on community_groups for insert
  with check (status = 'pending');

-- Safe public listing (no notes, submitter fields). SECURITY DEFINER; filters by status.
create or replace function public.list_public_community_groups(
  p_category text default null,
  p_search text default null
)
returns table (
  id uuid,
  organization_name text,
  slug text,
  category text,
  description text,
  website_url text,
  public_email text,
  public_phone text,
  meeting_location text,
  service_area text,
  social_url text,
  contact_person text,
  status text,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cg.id,
    cg.organization_name,
    cg.slug,
    cg.category,
    cg.description,
    cg.website_url,
    cg.public_email,
    cg.public_phone,
    cg.meeting_location,
    cg.service_area,
    cg.social_url,
    cg.contact_person,
    cg.status,
    cg.is_verified,
    cg.created_at,
    cg.updated_at
  from community_groups cg
  where cg.status in ('approved', 'published')
    and (p_category is null or trim(p_category) = '' or cg.category = trim(p_category))
    and (
      p_search is null
      or trim(p_search) = ''
      or cg.organization_name ilike '%' || trim(p_search) || '%'
      or coalesce(cg.description, '') ilike '%' || trim(p_search) || '%'
      or coalesce(cg.service_area, '') ilike '%' || trim(p_search) || '%'
      or coalesce(cg.meeting_location, '') ilike '%' || trim(p_search) || '%'
    )
  order by cg.organization_name asc;
$$;

revoke all on function public.list_public_community_groups(text, text) from public;
grant execute on function public.list_public_community_groups(text, text) to anon, authenticated;

-- PostgREST: anonymous submissions + authenticated admin CRUD (RLS still applies).
grant insert on table public.community_groups to anon;
grant select, insert, update, delete on table public.community_groups to authenticated;
