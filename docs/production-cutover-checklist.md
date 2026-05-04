# Production Cutover Checklist

This checklist supersedes section O of the May 2026 brutal assessment
and is the single source of truth for the production go / no-go.
Do **not** flip DNS until every box is checked or explicitly waived
in the PR.

---

## Phase 0 — Pre-cutover hygiene

- [ ] Tag the current `main` commit as `pre-staging-cutover`.
- [ ] Snapshot the staging Supabase project (Database backup +
      storage objects export). Retain at least 14 days.
- [ ] Confirm migrations 001 → 019 are applied to staging and the
      validation queries in `docs/staging-rls-security-fix-validation.md`
      pass.
- [ ] Confirm `seed.sql` has not been run against staging in the last
      30 days (or, if it has, that all fictional rows have been
      cleaned up; production must NEVER receive `seed.sql` data).

## Phase 1 — Re-label current Supabase as staging

- [ ] Rename the existing Supabase project to `kch-staging`.
- [ ] Confirm the staging project's anon and service-role keys are
      stored in Vercel staging env vars (not committed to repo).
- [ ] Confirm `VITE_APP_ENV=staging` on staging deployments and the
      banner is visible.
- [ ] Add a `staging` branch in GitHub from `main`; protect both
      `main` and `staging` (require PR review + CI).

## Phase 2 — Stand up production Supabase (no data clone)

- [ ] Create a new Supabase project `kch-production` in the same
      region as staging.
- [ ] Apply numbered migrations in order:
      `001_initial_schema.sql` → `019_gallery_and_storage_hardening.sql`.
- [ ] Skip `005`, `006`, `007` unless those events are part of the
      production day-1 calendar.
- [ ] Skip `seed.sql`. **Do not** run it.
- [ ] Apply `seed.production.example.sql` once (it is idempotent and
      seeds only the KIGH community + governance settings).
- [ ] In Supabase Auth settings, **disable email signup** for
      production. Admin invites only via the `create-admin-user`
      Edge Function.
- [ ] Create the first super_admin manually (Dashboard → Auth →
      Invite, then `update profiles set role='super_admin' …`).
- [ ] Insert a row in `admin_user_profiles` with
      `must_change_password = true` so the first admin is forced
      to rotate on first sign-in.
- [ ] Configure Storage CORS, file size limits, and allowed MIME
      types to match staging.
- [ ] Configure Auth → Email templates for the production domain.
- [ ] Configure SMTP if/when needed (until then Supabase default).

## Phase 3 — Stand up production Vercel project

- [ ] Create a new Vercel project `kch-production`.
- [ ] Link to the GitHub repo with **only `main`** as the deployable
      branch (Preview deployments can run against staging vars or
      preview vars).
- [ ] Set production env vars from `.env.production.example`:
      `VITE_APP_ENV=production`, `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_ANON_KEY`, `VITE_PRODUCTION_SUPABASE_URLS`,
      `VITE_STAGING_SUPABASE_URLS`, `VITE_APP_URL`, `VITE_APP_NAME`,
      `VITE_SITE_NAME`, `VITE_CONTACT_EMAIL`.
- [ ] Verify a build deployed against production env vars boots
      without throwing `Supabase environment guard failed`.
- [ ] Domain plan: production = apex `kenyancommunityhouston.org`,
      staging = subdomain. Configure both DNS targets.

## Phase 4 — Curated content port (no bulk copy)

- [ ] List the staging rows that should appear on production day-1
      (published events, published announcements, governance
      resources, etc.).
- [ ] Export each via the admin UI / SQL editor; re-insert into
      production via the admin UI **as a real super_admin**, or via
      a one-shot `seed_production_content.sql` you author by hand.
- [ ] Do **not** copy `members`, `contact_submissions`,
      `service_interests`, `profiles`, `audit_logs`, or any storage
      object that wasn't independently audited.
- [ ] Reset slugs, IDs, timestamps so production rows don't pretend
      to be the same rows as staging.

## Phase 5 — Production smoke test

Run through this list against the production URL (NOT staging) once
DNS is pointed.

### Public surface
- [ ] Homepage loads, mobile layout works, **no staging banner**.
- [ ] Events / Calendar / Announcements / Businesses /
      Community Support / Sports / Gallery / Resources / Community
      Groups / New to Houston / About / Governance / Privacy /
      Terms / Disclaimer all render.
- [ ] Contact form submits and admin receives the row with `phone`
      and `inquiry_type` populated.
- [ ] Contact form rejects submissions where the honeypot field
      is filled.
- [ ] Membership form submits via RPC; success page shown; row
      appears in admin members page.
- [ ] Service interest form submits; row visible only to admins.
- [ ] Submit-event/announcement/business/fundraiser forms produce
      `pending` rows and do not appear on the public site until an
      admin approves.
- [ ] Approved community ads appear in their placements; pending /
      rejected ads do not appear.

### Admin surface
- [ ] `/admin/login` works.
- [ ] A signed-in user with `profiles.role IS NULL` is redirected
      back to `/admin/login` (not the dashboard).
- [ ] Force-rotate password flow works on first sign-in.
- [ ] Admin dashboard, calendar, announcements, businesses,
      fundraisers, gallery, members, community groups, service
      interests, media submissions, contacts, resources, users,
      settings all load.
- [ ] Approval flow flips status from `pending → published` (or
      `approved`).
- [ ] Reject flow flips to `rejected`.
- [ ] `super_admin` can create another admin via the
      `create-admin-user` Edge Function; non-super cannot delete
      via `delete-admin-user`.

### Security
- [ ] Anon: cannot read `contact_submissions`, `members`,
      `household_members`, `membership_payments`, `service_interests`,
      `profiles`, `admin_user_profiles`, `member_media_submissions`,
      `profile_household_members`, `community_groups` (raw table),
      `audit_logs`, `community_admin_roles`,
      `kigh-private-documents` storage, `kigh-member-media`,
      `kigh-gallery-submissions`.
- [ ] Authenticated non-admin: cannot read or write any of the above
      except their own `profiles`, their own
      `profile_household_members`, their own
      `member_media_submissions`, their linked `members` row, and
      own-folder objects in `kigh-member-media` /
      `kigh-gallery-submissions`.
- [ ] `community_admin`: full CRUD on content tables and members,
      contacts, resources; cannot create or delete admin users.
- [ ] `super_admin`: full CRUD everywhere including admin users.
- [ ] Storage signed URLs for private buckets work and expire.
- [ ] `VITE_APP_ENV=production` and the runtime guard does not
      throw.
- [ ] No staging banner appears anywhere on the production URL.

### Operations
- [ ] DB backups enabled with PITR (or daily snapshots minimum).
- [ ] Storage object lifecycle policies configured.
- [ ] Edge Functions deployed (`create-admin-user`,
      `delete-admin-user`) with `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Monitoring / error reporting wired (Sentry recommended).
- [ ] Domain HTTPS, HSTS, security headers verified.
- [ ] DNS TTL low (300s) during cutover.

### Governance
- [ ] AGM month confirmed (`community_governance_settings.agm_month=11`).
- [ ] Quorum confirmed (`community_governance_settings.quorum_percent=25`).
- [ ] `select * from public.kigh_agm_quorum_required(public.kigh_default_community_id())`
      returns sensible numbers.

---

## Phase 6 — Rollback triggers

Initiate rollback (revert DNS, restore most recent backup) if any of
these is observed within the first 24 hours:

- RLS check returns "any authenticated user can read private
  table X." (Re-run the staging validation script against
  production.)
- An admin action raised an unexpected error and `audit_logs` has
  no record of it.
- Any public page exposes content from `kigh-private-documents`,
  `members`, `contact_submissions`, or `service_interests`.
- Email or domain configuration is wrong and outbound mail is
  failing for password rotation / notifications.
- Production build is hitting a non-production Supabase URL (the
  env guard should prevent this — if it doesn't, that itself is the
  rollback trigger).

---

## Phase 7 — Post-cutover

- [ ] Add a CI workflow (`.github/workflows/ci.yml`) that runs lint
      + Vite build + Playwright smoke against `main` PRs.
- [ ] Add a scheduled Supabase function or pg_cron job that
      re-validates RLS against the canonical anon-vs-admin tests.
- [ ] Add a public status / changelog page.
- [ ] Schedule a 30-day post-launch review.
