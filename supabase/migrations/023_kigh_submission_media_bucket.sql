-- ============================================================
-- 023 — Public submission media (flyers / posters)
-- ============================================================
-- Anonymous and authenticated users may upload only under
-- `public-submissions/{uuid}/{uuid}.{ext}` with strict extension
-- rules. No anon update/delete (overwrite blocked). Elevated admins
-- may delete for moderation. Public read uses unguessable object
-- paths; publication still flows through pending DB rows.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kigh-submission-media',
  'kigh-submission-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kigh_submission_media_select_public" on storage.objects;
create policy "kigh_submission_media_select_public"
  on storage.objects for select
  using (bucket_id = 'kigh-submission-media');

drop policy if exists "kigh_submission_media_insert_submissions" on storage.objects;
create policy "kigh_submission_media_insert_submissions"
  on storage.objects for insert
  with check (
    bucket_id = 'kigh-submission-media'
    and name ~ '^public-submissions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$'
  );

drop policy if exists "kigh_submission_media_delete_admin" on storage.objects;
create policy "kigh_submission_media_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'kigh-submission-media' and public.kigh_is_elevated_admin());
