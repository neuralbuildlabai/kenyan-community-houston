-- ============================================================
-- 083 — Internal KIGH fundraisers (funding mode)
-- ============================================================
-- "Submit a Fundraiser" can now be marked as an Internal KIGH
-- fundraiser: donations go to the official treasury handles listed
-- on "Ways to support KIGH" instead of an external GoFundMe link.
--
--   external (default) — submitter's own donation_url
--   internal           — KIGH handles, resolved at render time
--
-- Internal rows deliberately store NO payment details. The handles
-- live in src/lib/kighSupportOptions.ts and are resolved when the
-- page renders, so retiring a handle removes it everywhere at once.
-- Snapshotting handles onto a row would let a retired account keep
-- collecting money from an old fundraiser page.
--
-- Existing rows take the `external` default, so published listings
-- and the moderation queue behave exactly as before.

alter table public.fundraisers
  add column if not exists funding_mode text not null default 'external';

comment on column public.fundraisers.funding_mode is
  'How the fundraiser collects donations: external (submitter donation_url) or internal (official KIGH support handles, resolved at render time). Rows predating migration 083 are external.';

alter table public.fundraisers drop constraint if exists fundraisers_funding_mode_chk;
alter table public.fundraisers
  add constraint fundraisers_funding_mode_chk check (
    funding_mode in ('external', 'internal')
  );

-- Internal fundraisers must not carry an external donation link: the
-- public page would otherwise show two conflicting ways to give, and a
-- link entered before the checkbox was ticked would leak into
-- publication.
alter table public.fundraisers drop constraint if exists fundraisers_internal_no_donation_url_chk;
alter table public.fundraisers
  add constraint fundraisers_internal_no_donation_url_chk check (
    funding_mode <> 'internal' or donation_url is null
  );

-- Public submissions must not arrive pre-approved. The insert policy
-- from migration 002 only pinned `status`; an internal fundraiser is
-- branded "Organized by KIGH", so the verification state is pinned too.
-- Official status still comes only from an admin moving the row through
-- the existing moderation queue (admins write through the separate
-- "Admins have full access to fundraisers" policy).
drop policy if exists "Anyone can submit fundraisers" on public.fundraisers;
create policy "Anyone can submit fundraisers"
  on public.fundraisers
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and verification_status = 'unverified'
    and published_at is null
  );
