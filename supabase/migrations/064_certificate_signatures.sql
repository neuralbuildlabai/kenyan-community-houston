-- ============================================================
-- 064 — Certificate signatures library + record signature fields
-- ============================================================

create table if not exists public.certificate_signatures (
  id uuid primary key default gen_random_uuid(),
  signer_name text not null,
  signer_title text not null,
  image_url text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificate_signatures_signer_name_len check (char_length(trim(signer_name)) between 2 and 120),
  constraint certificate_signatures_signer_title_len check (char_length(trim(signer_title)) between 2 and 160),
  constraint certificate_signatures_image_url_len check (char_length(trim(image_url)) between 2 and 500)
);

create unique index if not exists certificate_signatures_single_default_idx
  on public.certificate_signatures (is_default)
  where is_default = true;

create index if not exists certificate_signatures_active_idx
  on public.certificate_signatures (is_active, signer_name);

comment on table public.certificate_signatures is 'Admin-managed signature images for KIGH certificate generation.';

alter table public.certificate_signatures enable row level security;

drop policy if exists "certificate_signatures elevated admin read" on public.certificate_signatures;
create policy "certificate_signatures elevated admin read"
  on public.certificate_signatures for select
  to authenticated
  using (public.kigh_is_elevated_admin());

drop policy if exists "certificate_signatures elevated admin insert" on public.certificate_signatures;
create policy "certificate_signatures elevated admin insert"
  on public.certificate_signatures for insert
  to authenticated
  with check (public.kigh_is_elevated_admin());

drop policy if exists "certificate_signatures elevated admin update" on public.certificate_signatures;
create policy "certificate_signatures elevated admin update"
  on public.certificate_signatures for update
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

drop policy if exists "certificate_signatures elevated admin delete" on public.certificate_signatures;
create policy "certificate_signatures elevated admin delete"
  on public.certificate_signatures for delete
  to authenticated
  using (public.kigh_is_elevated_admin());

grant select, insert, update, delete on public.certificate_signatures to authenticated;
grant select, insert, update, delete on public.certificate_signatures to service_role;

-- Extend certificate_records with signature selection metadata
alter table public.certificate_records
  add column if not exists signature_id uuid references public.certificate_signatures (id) on delete set null,
  add column if not exists signature_mode text not null default 'none',
  add column if not exists signature_image_url text;

alter table public.certificate_records
  drop constraint if exists certificate_records_signature_mode_check;

alter table public.certificate_records
  add constraint certificate_records_signature_mode_check
  check (signature_mode in ('none', 'default', 'selected'));

create index if not exists certificate_records_signature_id_idx
  on public.certificate_records (signature_id);

-- ─── Storage bucket: certificate-signatures ─────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'certificate-signatures',
  'certificate-signatures',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/jpg']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "certificate_signatures_storage public read" on storage.objects;
create policy "certificate_signatures_storage public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'certificate-signatures');

drop policy if exists "certificate_signatures_storage admin insert" on storage.objects;
create policy "certificate_signatures_storage admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'certificate-signatures' and public.kigh_is_elevated_admin());

drop policy if exists "certificate_signatures_storage admin update" on storage.objects;
create policy "certificate_signatures_storage admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'certificate-signatures' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'certificate-signatures' and public.kigh_is_elevated_admin());

drop policy if exists "certificate_signatures_storage admin delete" on storage.objects;
create policy "certificate_signatures_storage admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'certificate-signatures' and public.kigh_is_elevated_admin());
