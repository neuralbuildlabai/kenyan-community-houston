-- ============================================================
-- Private KIGH documents: resources columns + storage bucket
-- Bucket kigh-private-documents is not public. Only admins
-- (is_admin()) may read/write objects. RLS on resources already
-- hides admin_only rows from anonymous/public SELECT.
-- ============================================================

-- ─── resources: private file metadata (no public URLs) ─────
alter table resources add column if not exists storage_bucket text;
alter table resources add column if not exists storage_path text;
alter table resources add column if not exists original_filename text;
alter table resources add column if not exists file_size bigint;
alter table resources add column if not exists mime_type text;

comment on column resources.storage_bucket is 'Supabase Storage bucket id when file is stored privately.';
comment on column resources.storage_path is 'Object path within bucket; never expose in public UI for admin_only.';
comment on column resources.original_filename is 'Original upload filename for admin display.';

alter table resources drop constraint if exists resources_kigh_private_bucket_admin_only;
alter table resources add constraint resources_kigh_private_bucket_admin_only check (
  storage_bucket is null
  or storage_bucket <> 'kigh-private-documents'
  or access_level = 'admin_only'
);

-- ─── Storage bucket (private) ───────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('kigh-private-documents', 'kigh-private-documents', false, 52428800)
on conflict (id) do update set public = false;

-- ─── Storage policies: admin-only, no public read ───────────
drop policy if exists "kigh_private_documents select admin" on storage.objects;
create policy "kigh_private_documents select admin"
  on storage.objects for select
  using (bucket_id = 'kigh-private-documents' and public.is_admin());

drop policy if exists "kigh_private_documents insert admin" on storage.objects;
create policy "kigh_private_documents insert admin"
  on storage.objects for insert
  with check (bucket_id = 'kigh-private-documents' and public.is_admin());

drop policy if exists "kigh_private_documents update admin" on storage.objects;
create policy "kigh_private_documents update admin"
  on storage.objects for update
  using (bucket_id = 'kigh-private-documents' and public.is_admin())
  with check (bucket_id = 'kigh-private-documents' and public.is_admin());

drop policy if exists "kigh_private_documents delete admin" on storage.objects;
create policy "kigh_private_documents delete admin"
  on storage.objects for delete
  using (bucket_id = 'kigh-private-documents' and public.is_admin());
