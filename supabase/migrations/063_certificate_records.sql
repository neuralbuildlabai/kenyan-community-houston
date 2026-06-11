-- ============================================================
-- 063 — Certificate records (admin-only acknowledgement log)
-- ============================================================
-- Stores optional records of issued KIGH certificates for admin
-- search, reprint, and community recordkeeping.

create table if not exists public.certificate_records (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  design_style text not null,
  recipient_name text not null,
  certificate_type text not null,
  event_name text,
  issue_date date not null,
  signature_1_name text,
  signature_1_title text,
  signature_2_name text,
  signature_2_title text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  notes text,
  constraint certificate_records_recipient_len check (char_length(trim(recipient_name)) between 2 and 160),
  constraint certificate_records_template_len check (char_length(trim(template_id)) between 2 and 80),
  constraint certificate_records_design_style_len check (char_length(trim(design_style)) between 2 and 40),
  constraint certificate_records_type_len check (char_length(trim(certificate_type)) between 2 and 120),
  constraint certificate_records_event_len check (event_name is null or char_length(event_name) <= 200),
  constraint certificate_records_notes_len check (notes is null or char_length(notes) <= 500)
);

create index if not exists certificate_records_issue_date_idx
  on public.certificate_records (issue_date desc);

create index if not exists certificate_records_recipient_idx
  on public.certificate_records (lower(recipient_name));

create index if not exists certificate_records_template_idx
  on public.certificate_records (template_id);

create index if not exists certificate_records_created_at_idx
  on public.certificate_records (created_at desc);

comment on table public.certificate_records is 'Optional admin log of issued KIGH certificates and acknowledgements.';

alter table public.certificate_records enable row level security;

drop policy if exists "certificate_records elevated admin read" on public.certificate_records;
create policy "certificate_records elevated admin read"
  on public.certificate_records for select
  to authenticated
  using (public.kigh_is_elevated_admin());

drop policy if exists "certificate_records elevated admin insert" on public.certificate_records;
create policy "certificate_records elevated admin insert"
  on public.certificate_records for insert
  to authenticated
  with check (public.kigh_is_elevated_admin());

drop policy if exists "certificate_records elevated admin update" on public.certificate_records;
create policy "certificate_records elevated admin update"
  on public.certificate_records for update
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

drop policy if exists "certificate_records elevated admin delete" on public.certificate_records;
create policy "certificate_records elevated admin delete"
  on public.certificate_records for delete
  to authenticated
  using (public.kigh_is_elevated_admin());

grant select, insert, update, delete on public.certificate_records to authenticated;
grant select, insert, update, delete on public.certificate_records to service_role;
