-- ============================================================
-- KIGH hub: calendar extensions, membership, resources, RPC
-- ============================================================

-- ─── Extend content_status for cancelled events ────────────
ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ─── Extend events (calendar) ──────────────────────────────
alter table events add column if not exists short_description text;
alter table events add column if not exists timezone text default 'America/Chicago';
alter table events add column if not exists city text;
alter table events add column if not exists state text default 'TX';
alter table events add column if not exists is_virtual boolean not null default false;
alter table events add column if not exists virtual_url text;
alter table events add column if not exists registration_url text;
alter table events add column if not exists image_url text;
alter table events add column if not exists is_featured boolean not null default false;
alter table events add column if not exists capacity integer;
alter table events add column if not exists organizer_email text;

comment on column events.virtual_url is 'Public meeting link; only show for published events in UI.';

-- ─── Members & household ───────────────────────────────────
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  address_line1 text,
  city text,
  state text,
  zip_code text,
  kenyan_county_or_heritage text,
  preferred_communication text,
  membership_type text not null
    check (membership_type in ('individual', 'family_household', 'associate')),
  interests text[] not null default '{}',
  agreed_to_constitution boolean not null default false,
  consent_to_communications boolean not null default false,
  dues_status text not null default 'pending'
    check (dues_status in ('pending', 'paid', 'waived', 'overdue')),
  membership_status text not null default 'pending'
    check (membership_status in ('pending', 'active', 'inactive', 'rejected')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_email_idx on members (lower(email));
create index if not exists members_membership_status_idx on members (membership_status);
create index if not exists members_submitted_at_idx on members (submitted_at desc);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  full_name text not null,
  relationship text,
  age_group text check (age_group is null or age_group in ('adult', 'youth', 'child')),
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists household_members_member_id_idx on household_members (member_id);

create table if not exists membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  amount numeric(10,2) not null default 20,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'waived')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists membership_payments_member_id_idx on membership_payments (member_id);

-- ─── Resources library ─────────────────────────────────────
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  category text not null,
  file_type text,
  file_url text,
  external_url text,
  access_level text not null default 'needs_review'
    check (access_level in ('public', 'members_only', 'admin_only', 'needs_review')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  resource_date date,
  related_event_id uuid references events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_status_access_idx on resources (status, access_level);
create index if not exists resources_category_idx on resources (category);

-- ─── updated_at triggers ─────────────────────────────────────
drop trigger if exists members_updated_at on members;
create trigger members_updated_at before update on members
  for each row execute function set_updated_at();

drop trigger if exists resources_updated_at on resources;
create trigger resources_updated_at before update on resources
  for each row execute function set_updated_at();

-- ─── RLS: members ───────────────────────────────────────────
alter table members enable row level security;

create policy "Admins full access members"
  on members for all
  using (is_admin())
  with check (is_admin());

-- ─── RLS: household_members ─────────────────────────────────
alter table household_members enable row level security;

create policy "Admins full access household_members"
  on household_members for all
  using (is_admin())
  with check (is_admin());

-- ─── RLS: membership_payments ──────────────────────────────
alter table membership_payments enable row level security;

create policy "Admins full access membership_payments"
  on membership_payments for all
  using (is_admin())
  with check (is_admin());

-- ─── RLS: resources ─────────────────────────────────────────
alter table resources enable row level security;

create policy "Public read published public resources"
  on resources for select
  using (status = 'published' and access_level = 'public');

create policy "Admins full access resources"
  on resources for all
  using (is_admin())
  with check (is_admin());

-- ─── Membership registration RPC (bypasses RLS safely) ─────
create or replace function public.submit_membership_registration(p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_first text;
  v_last text;
  v_email text;
  v_type text;
  v_agreed boolean;
  v_consent boolean;
begin
  v_first := trim(p_data->>'first_name');
  v_last := trim(p_data->>'last_name');
  v_email := lower(trim(p_data->>'email'));
  v_type := p_data->>'membership_type';
  v_agreed := coalesce((p_data->>'agreed_to_constitution')::boolean, false);
  v_consent := coalesce((p_data->>'consent_to_communications')::boolean, false);

  if v_first is null or v_first = '' or v_last is null or v_last = '' or v_email is null or v_email = '' then
    raise exception 'missing_required_fields';
  end if;

  if v_type is null or v_type not in ('individual', 'family_household', 'associate') then
    raise exception 'invalid_membership_type';
  end if;

  if not v_agreed or not v_consent then
    raise exception 'consent_required';
  end if;

  insert into members (
    first_name, last_name, email, phone, address_line1, city, state, zip_code,
    kenyan_county_or_heritage, preferred_communication, membership_type, interests,
    agreed_to_constitution, consent_to_communications
  ) values (
    v_first,
    v_last,
    v_email,
    nullif(trim(p_data->>'phone'), ''),
    nullif(trim(p_data->>'address_line1'), ''),
    nullif(trim(p_data->>'city'), ''),
    nullif(trim(p_data->>'state'), ''),
    nullif(trim(p_data->>'zip_code'), ''),
    nullif(trim(p_data->>'kenyan_county_or_heritage'), ''),
    nullif(trim(p_data->>'preferred_communication'), ''),
    v_type,
    coalesce(
      (
        select array_agg(trim(elem)) filter (where trim(elem) <> '')
        from jsonb_array_elements_text(coalesce(p_data->'interests', '[]'::jsonb)) as t(elem)
      ),
      '{}'::text[]
    ),
    v_agreed,
    v_consent
  )
  returning id into v_id;

  if v_type = 'family_household' and jsonb_typeof(p_data->'household') = 'array' then
    for v_h in
      select elem from lateral jsonb_array_elements(coalesce(p_data->'household', '[]'::jsonb)) as t(elem)
    loop
      if nullif(trim(v_h.elem->>'full_name'), '') is not null then
        insert into household_members (member_id, full_name, relationship, age_group, email, phone)
        values (
          v_id,
          trim(v_h.elem->>'full_name'),
          nullif(trim(v_h.elem->>'relationship'), ''),
          case when v_h.elem->>'age_group' in ('adult', 'youth', 'child') then v_h.elem->>'age_group' else null end,
          nullif(trim(v_h.elem->>'email'), ''),
          nullif(trim(v_h.elem->>'phone'), '')
        );
      end if;
    end loop;
  end if;

  return v_id;
end;
$$;

revoke all on function public.submit_membership_registration(jsonb) from public;
grant execute on function public.submit_membership_registration(jsonb) to anon, authenticated;

-- ─── Seed public resources (idempotent) ────────────────────
insert into resources (title, slug, description, category, file_type, file_url, access_level, status, resource_date)
values
  (
    'KIGH Constitution and Bylaws',
    'kigh-constitution-bylaws',
    'Official constitution and bylaws for Kenyans in Greater Houston.',
    'Governance',
    'docx',
    '/kigh-documents/governance/KIGH Constitution and Bylaws.docx',
    'public',
    'published',
    current_date
  ),
  (
    'KIGH Rules and Regulations',
    'kigh-rules-and-regulations',
    'Community rules and regulations.',
    'Governance',
    'docx',
    '/kigh-documents/governance/KIGH Rules and Regulations .docx',
    'public',
    'published',
    current_date
  ),
  (
    'KIGH Roles and Responsibilities',
    'kigh-roles-and-responsibilities',
    'Leadership roles and responsibilities.',
    'Governance',
    'docx',
    '/kigh-documents/governance/KIGH Roles and Responsibilities.docx',
    'public',
    'published',
    current_date
  ),
  (
    'HR and Benefits - Joyce Marendes',
    'hr-benefits-joyce-marendes',
    'Presentation on HR and benefits.',
    'Presentations',
    'pptx',
    '/kigh-documents/presentations/HR and Benefits - Joyce Marendes.pptx',
    'public',
    'published',
    current_date
  ),
  (
    'KIGH Financial Literacy',
    'kigh-financial-literacy',
    'Financial literacy presentation.',
    'Presentations',
    'pptx',
    '/kigh-documents/presentations/KIGH Financial Literacy.pptx',
    'public',
    'published',
    current_date
  ),
  (
    'KIGH Presentation Slides',
    'kigh-presentation-slides',
    'General KIGH presentation slides.',
    'Presentations',
    'pptx',
    '/kigh-documents/presentations/KIGH Presentation Slides.pptx',
    'public',
    'published',
    current_date
  ),
  (
    'KIGH Virtual Meet Greet',
    'kigh-virtual-meet-greet',
    'Virtual meet and greet materials.',
    'Presentations',
    'pptx',
    '/kigh-documents/presentations/KIGH Virtual Meet Greet.pptx',
    'public',
    'published',
    current_date
  ),
  (
    'Tax Presentation 04-24-2026',
    'tax-presentation-04-24-2026',
    'Tax presentation from April 24, 2026.',
    'Presentations',
    'pdf',
    '/kigh-documents/presentations/Tax Presentation_04-24-2026.pdf',
    'public',
    'published',
    '2026-04-24'
  )
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  file_type = excluded.file_type,
  file_url = excluded.file_url,
  access_level = excluded.access_level,
  status = excluded.status,
  resource_date = excluded.resource_date,
  updated_at = now();
