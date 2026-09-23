-- ============================================================
-- 081 — Let elevated admins read gallery-public objects
-- ============================================================
-- Publishing a pending photo copies it into gallery-public with
-- upsert (INSERT ... ON CONFLICT DO UPDATE RETURNING). Postgres
-- checks SELECT policies on that statement. Migration 054 dropped
-- the broad gallery_public_read policy so anonymous clients cannot
-- list the bucket. Public image URLs still work because the bucket
-- is public. The approve path then failed with
-- "new row violates row-level security policy" even for super_admin,
-- because no SELECT policy covered the new row.
--
-- This restores SELECT for elevated admins only. It does not
-- recreate a public listing policy.

drop policy if exists "gallery_public_select_admin" on storage.objects;
create policy "gallery_public_select_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'gallery-public'
    and public.kigh_is_elevated_admin()
  );
