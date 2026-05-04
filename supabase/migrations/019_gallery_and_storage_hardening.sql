-- ============================================================
-- 019 — Gallery default + storage hardening
-- ============================================================
-- 1. Default `gallery_images.status` to 'pending' so future
--    public/member uploads do not go live without admin review.
--    Admin uploads still pass `status='published'` explicitly.
-- 2. Tighten the legacy public-bucket storage policies that
--    relied on `auth.uid() is not null` (any signed-in user could
--    upload to public buckets). Replace with elevated-admin check.
-- 3. Re-affirm `kigh-private-documents` policies use the new
--    elevated helper. Existing policies already call `is_admin()`
--    which migration 013 repaired, but we drop+recreate them
--    against the canonical helper for clarity and to avoid
--    relying on the alias forever.

-- ─── 1. gallery_images default status ───────────────────────
alter table public.gallery_images alter column status set default 'pending';

-- ─── 2. Tighten legacy public-bucket upload policies ────────

-- gallery
drop policy if exists "Admin upload gallery" on storage.objects;
create policy "Admin upload gallery"
  on storage.objects for insert
  with check (bucket_id = 'gallery' and public.kigh_is_elevated_admin());

drop policy if exists "Admin delete gallery" on storage.objects;
create policy "Admin delete gallery"
  on storage.objects for delete
  using (bucket_id = 'gallery' and public.kigh_is_elevated_admin());

drop policy if exists "Admin update gallery" on storage.objects;
create policy "Admin update gallery"
  on storage.objects for update
  using (bucket_id = 'gallery' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'gallery' and public.kigh_is_elevated_admin());

-- event-flyers
drop policy if exists "Admin upload event flyers" on storage.objects;
create policy "Admin upload event flyers"
  on storage.objects for insert
  with check (bucket_id = 'event-flyers' and public.kigh_is_elevated_admin());

drop policy if exists "Admin delete event flyers" on storage.objects;
create policy "Admin delete event flyers"
  on storage.objects for delete
  using (bucket_id = 'event-flyers' and public.kigh_is_elevated_admin());

drop policy if exists "Admin update event flyers" on storage.objects;
create policy "Admin update event flyers"
  on storage.objects for update
  using (bucket_id = 'event-flyers' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'event-flyers' and public.kigh_is_elevated_admin());

-- business-logos
drop policy if exists "Admin upload business logos" on storage.objects;
create policy "Admin upload business logos"
  on storage.objects for insert
  with check (bucket_id = 'business-logos' and public.kigh_is_elevated_admin());

drop policy if exists "Admin delete business logos" on storage.objects;
create policy "Admin delete business logos"
  on storage.objects for delete
  using (bucket_id = 'business-logos' and public.kigh_is_elevated_admin());

drop policy if exists "Admin update business logos" on storage.objects;
create policy "Admin update business logos"
  on storage.objects for update
  using (bucket_id = 'business-logos' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'business-logos' and public.kigh_is_elevated_admin());

-- fundraiser-images
drop policy if exists "Admin upload fundraiser images" on storage.objects;
create policy "Admin upload fundraiser images"
  on storage.objects for insert
  with check (bucket_id = 'fundraiser-images' and public.kigh_is_elevated_admin());

drop policy if exists "Admin delete fundraiser images" on storage.objects;
create policy "Admin delete fundraiser images"
  on storage.objects for delete
  using (bucket_id = 'fundraiser-images' and public.kigh_is_elevated_admin());

drop policy if exists "Admin update fundraiser images" on storage.objects;
create policy "Admin update fundraiser images"
  on storage.objects for update
  using (bucket_id = 'fundraiser-images' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'fundraiser-images' and public.kigh_is_elevated_admin());

-- ─── 3. kigh-private-documents (canonical elevated helper) ──
drop policy if exists "kigh_private_documents select admin" on storage.objects;
create policy "kigh_private_documents select admin"
  on storage.objects for select
  using (bucket_id = 'kigh-private-documents' and public.kigh_is_elevated_admin());

drop policy if exists "kigh_private_documents insert admin" on storage.objects;
create policy "kigh_private_documents insert admin"
  on storage.objects for insert
  with check (bucket_id = 'kigh-private-documents' and public.kigh_is_elevated_admin());

drop policy if exists "kigh_private_documents update admin" on storage.objects;
create policy "kigh_private_documents update admin"
  on storage.objects for update
  using (bucket_id = 'kigh-private-documents' and public.kigh_is_elevated_admin())
  with check (bucket_id = 'kigh-private-documents' and public.kigh_is_elevated_admin());

drop policy if exists "kigh_private_documents delete admin" on storage.objects;
create policy "kigh_private_documents delete admin"
  on storage.objects for delete
  using (bucket_id = 'kigh-private-documents' and public.kigh_is_elevated_admin());
