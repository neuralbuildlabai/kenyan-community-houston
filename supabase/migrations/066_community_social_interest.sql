-- ============================================================
-- 066 — Optional community social interest flag
-- ============================================================
-- Lightweight boolean for organizations that opt in to being
-- contacted about upcoming community social sessions. Replaces
-- the need for a full July participation form on the public page.
-- ============================================================

alter table public.community_groups
  add column if not exists community_social_interest boolean not null default false;

create index if not exists community_groups_social_interest_idx
  on public.community_groups (community_social_interest)
  where community_social_interest = true;

comment on column public.community_groups.community_social_interest is
  'When true, the submitter asked to be contacted about upcoming community social sessions.';
