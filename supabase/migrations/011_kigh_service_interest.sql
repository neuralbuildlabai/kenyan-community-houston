-- Volunteer / leadership interest submissions (public insert, admin read/update)

create table public.service_interests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  area_of_interest text,
  how_to_help text,
  availability text not null default 'occasional'
    check (availability in (
      'occasional',
      'monthly',
      'events_only',
      'committee_role',
      'leadership_role'
    )),
  skills_experience text,
  open_to_leadership_contact boolean not null default false,
  notes text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'in_review', 'matched', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_interests_created_at_idx on public.service_interests (created_at desc);
create index service_interests_status_idx on public.service_interests (status);
create index service_interests_email_idx on public.service_interests (lower(email));

comment on table public.service_interests is 'Public volunteer / leadership interest form submissions; readable only by admins.';

drop trigger if exists service_interests_updated_at on public.service_interests;
create trigger service_interests_updated_at
  before update on public.service_interests
  for each row execute function public.set_updated_at();

alter table public.service_interests enable row level security;

-- Anyone (including anon) may submit; no public SELECT policy
create policy "Anyone can insert service interest"
  on public.service_interests for insert
  with check (true);

create policy "Admins can select service interests"
  on public.service_interests for select
  using (public.is_admin());

create policy "Admins can update service interests"
  on public.service_interests for update
  using (public.is_admin())
  with check (public.is_admin());
