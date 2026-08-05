-- ============================================================
-- 075 — Submission media bucket: accept office documents
-- ============================================================
-- The kigh-submission-media bucket (migration 023) only allowed
-- images + PDF, which blocked admins from publishing community
-- resource documents (e.g. PPTX decks) to public view. Widen the
-- bucket to common office formats and raise the size limit to
-- 25 MB (presentation decks routinely exceed the old 10 MB cap).
--
-- Both enforcement layers must agree:
--   1. storage.buckets.allowed_mime_types
--   2. the insert policy's object-path extension regex
-- Client-side validation lives in src/lib/submissionMediaUpload.ts
-- (MIME_EXT) — keep all three in sync.
-- ============================================================

update storage.buckets
set
  file_size_limit = 26214400, -- 25 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
where id = 'kigh-submission-media';

drop policy if exists "kigh_submission_media_insert_submissions" on storage.objects;
create policy "kigh_submission_media_insert_submissions"
  on storage.objects for insert
  with check (
    bucket_id = 'kigh-submission-media'
    and name ~ '^public-submissions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf|doc|docx|ppt|pptx|xls|xlsx)$'
  );
