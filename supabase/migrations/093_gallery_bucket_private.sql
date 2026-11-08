-- ============================================================
-- 093 — Make the gallery bucket private
-- ============================================================
-- Run only after migration 092 is applied AND the app version that
-- shows gallery images through signed URLs is live in production
-- (src/lib/galleryImageUrls.ts). From here on a stored
-- `/object/public/gallery-public/...` URL no longer loads; files are
-- reachable only through a signed URL, which storage issues only for
-- objects the caller may read (policy from 092; admins via 081).
--
-- A signed URL already handed out stays valid until it expires
-- (the app signs for 1 hour).
--
-- Rollback (re-opens public file URLs):
--   update storage.buckets set public = true where id = 'gallery-public';
-- ============================================================

update storage.buckets set public = false where id = 'gallery-public';
