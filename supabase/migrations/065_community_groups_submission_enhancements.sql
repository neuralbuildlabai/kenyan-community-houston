-- ============================================================
-- 065 — Community group submission enhancements
-- ============================================================
-- Adds submission purpose (directory vs update, optional July social),
-- internal contact person fields, authorization flag, and July
-- participation details. Expands category values. Internal fields
-- are admin-only — not exposed via list_public_community_groups.
-- ============================================================

-- ─── Expand category values ──────────────────────────────────
alter table public.community_groups
  drop constraint if exists community_groups_category_check;

alter table public.community_groups
  add constraint community_groups_category_check
  check (category in (
    'religious_institution',
    'benevolence_group',
    'welfare_group',
    'youth_family_group',
    'cultural_organization',
    'professional_networking_group',
    'women_group',
    'mens_group',
    'alumni_group',
    'nonprofit',
    'community_institution',
    'sports_recreation_group',
    'other'
  ));

-- ─── Submission purpose & contact fields ─────────────────────
alter table public.community_groups
  add column if not exists submission_purpose text not null default 'directory_listing',
  add column if not exists contact_person_name text,
  add column if not exists contact_person_role text,
  add column if not exists contact_person_email text,
  add column if not exists contact_person_phone text,
  add column if not exists best_contact_method text,
  add column if not exists authorized_submission boolean not null default false,
  add column if not exists public_contact_ok boolean not null default false,
  add column if not exists july_interest text,
  add column if not exists july_representative_name text,
  add column if not exists july_representative_contact text,
  add column if not exists july_estimated_attendees integer,
  add column if not exists july_intro_interest text,
  add column if not exists july_topics text,
  add column if not exists july_notes text;

alter table public.community_groups
  drop constraint if exists community_groups_submission_purpose_check;

alter table public.community_groups
  add constraint community_groups_submission_purpose_check
  check (submission_purpose in (
    'directory_listing',
    'directory_and_july_participation',
    'update_existing',
    'update_existing_and_july_participation'
  ));

alter table public.community_groups
  drop constraint if exists community_groups_best_contact_method_check;

alter table public.community_groups
  add constraint community_groups_best_contact_method_check
  check (
    best_contact_method is null
    or best_contact_method in ('phone', 'text_whatsapp', 'email')
  );

alter table public.community_groups
  drop constraint if exists community_groups_july_interest_check;

alter table public.community_groups
  add constraint community_groups_july_interest_check
  check (
    july_interest is null
    or july_interest in ('yes', 'maybe', 'no_keep_informed')
  );

alter table public.community_groups
  drop constraint if exists community_groups_july_intro_interest_check;

alter table public.community_groups
  add constraint community_groups_july_intro_interest_check
  check (
    july_intro_interest is null
    or july_intro_interest in ('yes', 'no', 'maybe')
  );

create index if not exists community_groups_submission_purpose_idx
  on public.community_groups (submission_purpose);

comment on column public.community_groups.submission_purpose is
  'Why the submitter is filling the form: directory listing, update, and/or July social participation.';
comment on column public.community_groups.contact_person_name is
  'Internal outreach contact — not shown publicly unless duplicated in public fields.';
comment on column public.community_groups.authorized_submission is
  'Submitter confirmed they are authorized to register/update this organization.';
