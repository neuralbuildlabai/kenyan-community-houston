-- ============================================================
-- 035 — Gallery user submissions (private) + public approved bucket
-- ============================================================
-- UAT-ready pipeline:
--   * `gallery-submissions` — private; anon/auth upload only under
--     `pending/a/{uuid}/…` or `pending/u/{auth_uid}/…`; no public SELECT.
--   * `gallery-public` — public read; only elevated admins write.
--   * `gallery_images` pending rows store submission paths; `image_url` /
--     `thumbnail_url` filled after admin approval (published).
--   * Public INSERT on `gallery_images` limited to pending + submission paths.

-- ─── 1. Buckets ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-submissions',
  'gallery-submissions',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery-public',
  'gallery-public',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── 2. gallery-submissions storage policies ────────────────
drop policy if exists "gallery_submissions_select_admin" on storage.objects;
create policy "gallery_submissions_select_admin"
  on storage.objects for select
  using (bucket_id = 'gallery-submissions' and public.kigh_is_elevated_admin());

drop policy if exists "gallery_submissions_insert_paths" on storage.objects;
create policy "gallery_submissions_insert_paths"
  on storage.objects for insert
  with check (
    bucket_id = 'gallery-submissions'
    and (
      (
        auth.uid() is null
        and split_part(name, '/', 1) = 'pending'
        and split_part(name, '/', 2) = 'a'
        and split_part(name, '/', 3) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and split_part(name, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(web|thumb)\.(webp|jpg|jpeg)$'
      )
      or (
        auth.uid() is not null
        and split_part(name, '/', 1) = 'pending'
        and split_part(name, '/', 2) = 'u'
        and split_part(name, '/', 3) = auth.uid()::text
        and split_part(name, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(web|thumb)\.(webp|jpg|jpeg)$'
      )
    )
  );

drop policy if exists "gallery_submissions_delete_admin_or_owner" on storage.objects;
create policy "gallery_submissions_delete_admin_or_owner"
  on storage.objects for delete
  using (
    bucket_id = 'gallery-submissions'
    and (
      public.kigh_is_elevated_admin()
      or (
        auth.uid() is not null
        and split_part(name, '/', 1) = 'pending'
        and split_part(name, '/', 2) = 'u'
        and split_part(name, '/', 3) = auth.uid()::text
      )
    )
  );

drop policy if exists "gallery_submissions_update_admin_or_owner" on storage.objects;
create policy "gallery_submissions_update_admin_or_owner"
  on storage.objects for update
  using (
    bucket_id = 'gallery-submissions'
    and (
      public.kigh_is_elevated_admin()
      or (
        auth.uid() is not null
        and split_part(name, '/', 1) = 'pending'
        and split_part(name, '/', 2) = 'u'
        and split_part(name, '/', 3) = auth.uid()::text
      )
    )
  )
  with check (
    bucket_id = 'gallery-submissions'
    and (
      public.kigh_is_elevated_admin()
      or (
        auth.uid() is not null
        and split_part(name, '/', 1) = 'pending'
        and split_part(name, '/', 2) = 'u'
        and split_part(name, '/', 3) = auth.uid()::text
      )
    )
  );

-- ─── 3. gallery-public storage policies ─────────────────────
drop policy if exists "gallery_public_read" on storage.objects;
create policy "gallery_public_read"
  on storage.objects for select
  using (bucket_id = 'gallery-public');

drop policy if exists "gallery_public_write_admin" on storage.objects;
create policy "gallery_public_write_admin"
  on storage.objects for insert
  with check (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin());

drop policy if exists "gallery_public_update_admin" on storage.objects;
create policy "gallery_public_update_admin"
  on storage.objects for update
  using (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin());

drop policy if exists "gallery_public_delete_admin" on storage.objects;
create policy "gallery_public_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'gallery-public' and public.kigh_is_elevated_admin());

-- ─── 4. gallery_albums columns + visibility ─────────────────
alter table public.gallery_albums
  add column if not exists event_date date,
  add column if not exists visibility text not null default 'public',
  add column if not exists open_for_submissions boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.gallery_albums
  drop constraint if exists gallery_albums_visibility_check;

alter table public.gallery_albums
  add constraint gallery_albums_visibility_check
  check (visibility in ('public', 'members', 'hidden'));

drop trigger if exists gallery_albums_updated_at on public.gallery_albums;
create trigger gallery_albums_updated_at
  before update on public.gallery_albums
  for each row execute function public.set_updated_at();

-- ─── 5. gallery_images columns ──────────────────────────────
alter table public.gallery_images alter column image_url drop not null;

alter table public.gallery_images
  add column if not exists thumbnail_url text,
  add column if not exists alt_text text,
  add column if not exists submitted_by_user_id uuid,
  add column if not exists submitted_by_name text,
  add column if not exists submitted_by_email text,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists is_homepage_featured boolean not null default false,
  add column if not exists sort_order int not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists submission_storage_bucket text,
  add column if not exists submission_storage_path text,
  add column if not exists submission_thumb_path text;

create index if not exists gallery_images_status_homepage_idx
  on public.gallery_images (status, is_homepage_featured)
  where status = 'published' and is_homepage_featured = true;

drop trigger if exists gallery_images_updated_at on public.gallery_images;
create trigger gallery_images_updated_at
  before update on public.gallery_images
  for each row execute function public.set_updated_at();

-- ─── 6. Album RLS: hide non-public albums from anon ─────────
drop policy if exists "Public can read gallery albums" on public.gallery_albums;

create policy "Public can read gallery albums"
  on public.gallery_albums for select
  using (
    coalesce(visibility, 'public') = 'public'
    and (
      open_for_submissions = true
      or exists (
        select 1
        from public.gallery_images gi
        where gi.album_id = gallery_albums.id
          and gi.status = 'published'
      )
    )
  );

-- Allow public gallery submissions through PostgREST while RLS keeps rows constrained.
grant insert on public.gallery_images to anon, authenticated;
grant select on public.gallery_images to anon, authenticated;

-- ─── 7. gallery_images: public may insert pending submissions
drop policy if exists "Public may submit pending gallery images" on public.gallery_images;

create policy "Public may submit pending gallery images"
  on public.gallery_images for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and image_url is null
    and thumbnail_url is null
    and submission_storage_bucket = 'gallery-submissions'
    and submission_storage_path is not null
    and submission_thumb_path is not null
    and regexp_replace(submission_storage_path, '/[^/]+$', '') = regexp_replace(submission_thumb_path, '/[^/]+$', '')
    and community_id = public.kigh_default_community_id()
    and (
      (
        auth.uid() is not null
        and submitted_by_user_id = auth.uid()
        and submission_storage_path like ('pending/u/' || auth.uid()::text || '/%')
      )
      or (
        auth.uid() is null
        and submitted_by_user_id is null
        and submitted_by_name is not null
        and length(trim(submitted_by_name)) >= 2
        and submitted_by_email is not null
        and position('@' in submitted_by_email) > 1
        and submission_storage_path like 'pending/a/%'
      )
    )
  );

comment on column public.gallery_images.submission_storage_path is
  'Private object key in gallery-submissions for the web-sized image (paired with submission_thumb_path in the same folder).';
