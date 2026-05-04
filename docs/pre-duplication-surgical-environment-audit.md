# Pre-Duplication Surgical Environment Audit

Project: Kenyan Community Houston (KIGH)
Audit date: 2026-05-04
Audit owner: senior full-stack launch architect / Supabase reviewer
Scope: final pre-duplication review of the current repo + the linked
Supabase project before standing up a clean production Supabase
project. **No production project was created. No remote DB writes.
No migrations pushed. No commits or pushes were made.**

This report supersedes the earlier
`staging-production-duplication-brutal-assessment.md` for the
specific question "can we now create a clean production project from
this codebase". Cross-references to that earlier doc and to
`security-hardening-run.md`, `staging-rls-security-fix-validation.md`,
`multi-community-domain-and-ads-foundation.md`, and
`production-cutover-checklist.md` are kept where useful.

---

## A. Executive verdict

**READY AFTER SPECIFIC FIXES.**

The hardening run that produced migrations 013–019 closed the major
RLS / `is_admin()` / private-documents / contact-form / gallery
holes flagged in the brutal assessment. Environment separation
plumbing (`appEnv.ts`, `StagingBanner`, allow-list guard,
`.env.{staging,production}.example`) is in place and behaves
correctly. Migrations 001–019 form a coherent, idempotent chain
that a clean Supabase project should accept without dirty data.

However, the audit found **one new critical finding** that must be
fixed before duplication, plus a small number of medium/low risks
that should not block production but must not regress in it.

The critical finding is that
`public.profiles.role` was created with `default 'community_admin'`
(migration 010) and the `"profiles insert own"` policy lets any
authenticated user insert their own profile row without
constraining `role`. Combined with `kigh_is_elevated_admin()`
treating `community_admin` as an elevated role, this is a
self-elevation primitive: any auth user (including a self-signed-up
user if Supabase email signup is enabled) can become an admin.

This run ships migration `020_profiles_role_guard.sql` and a small
typings update to close that hole safely. With migration 020
applied to BOTH the current staging project and the new production
project, the duplication is safe to proceed.

---

## B. Current environment snapshot

- Repo: `/Users/omoke/projects/kenyan-community-houston`
- Branch: `main`
- HEAD: `40be531 harden staging for production split` (clean tree
  before this run; this run touches one migration and one types
  file — see section H).
- Local origin: `origin/main` in sync with HEAD before this run.
- `.env` (local, not committed):
  - `VITE_APP_ENV=staging` ✓
  - `VITE_SUPABASE_URL=https://eipjpvltwmvdyvbqqwus.supabase.co` —
    the linked staging project. Anon key only. No service role in
    `.env`.
- Linked Supabase project ref (per `supabase/.temp/project-ref`):
  `eipjpvltwmvdyvbqqwus`. The `.temp` directory is `.gitignore`d.
- `git ls-files` confirms the only env files committed are the
  `.env*.example` templates. No real `.env` is tracked.
- Migrations: `001 → 020` after this run (020 is new and **not yet
  applied anywhere**). 001 → 019 are confirmed applied to the
  linked staging project per the user's
  `supabase migration list --linked` output.
- `npm run build`: passes locally per the user. The audit's Linux
  sandbox cannot reproduce the build because the locally-installed
  `node_modules` contain a darwin-specific Rollup native binary; we
  did not attempt to install Linux binaries because (a) it would
  mutate `node_modules`, (b) `npm install` is blocked from the
  registry in the sandbox, and (c) the local pass is authoritative.

---

## C. What was verified

1. Repository hygiene: branch, HEAD, working tree, `.gitignore`,
   tracked-vs-untracked env files, no committed secrets.
2. `src/lib/appEnv.ts` and `src/lib/supabase.ts` env handling —
   `VITE_APP_ENV` parsing, allow-list guard semantics, hard-fail
   in production vs warn-only in staging/dev.
3. `src/components/StagingBanner.tsx` rendering rules.
4. `.env.example`, `.env.staging.example`, `.env.production.example`
   contents and threat model.
5. Every migration file 001 → 019 read in full.
6. Helpers `is_admin()`, `kigh_is_elevated_admin()`,
   `kigh_current_user_role()`, `kigh_is_platform_super_admin()`,
   `kigh_has_community_role()`, `kigh_default_community_id()`,
   `kigh_record_audit()`, `kigh_link_member_to_user()`,
   `kigh_agm_quorum_required()`, `list_active_community_ads()`,
   `list_public_community_groups()`, `submit_membership_registration()`.
7. RLS policies on `events`, `announcements`, `businesses`,
   `fundraisers`, `sports_posts`, `gallery_albums`, `gallery_images`,
   `contact_submissions`, `members`, `household_members`,
   `membership_payments`, `resources`, `community_groups`,
   `service_interests`, `profiles`, `admin_user_profiles`,
   `profile_household_members`, `member_media_submissions`,
   `communities`, `community_domains`, `community_admin_roles`,
   `community_governance_settings`, `audit_logs`, `community_ads`.
8. Storage policies on buckets `gallery`, `event-flyers`,
   `business-logos`, `fundraiser-images`, `kigh-private-documents`,
   `kigh-member-media`, `kigh-gallery-submissions`.
9. Frontend auth: `AuthContext`, `ProtectedRoute`, `RequireAuth`,
   `MemberLoginPage`, `AdminLoginPage`, `AdminChangePasswordPage`,
   `ProfilePage` profile auto-create flow.
10. Public flows: `MembershipPage` (calls
    `submit_membership_registration` RPC), `ContactPage`
    (post-018 schema + honeypot), `GalleryPage` public, ad listing
    expectations.
11. Admin flows: `AdminMembersPage`, `AdminContactsPage`,
    `BusinessesPage`, `GalleryPage`, `UsersPage`,
    `AdminCommunityGroupsPage`, `AdminMediaSubmissionsPage`.
12. Seeds: `supabase/seed.sql` and `supabase/seed.production.example.sql`.
13. Grep sweep for hardcoded Supabase URLs, JWTs, service-role
    references, hardcoded prod/staging domains, `using (true)` /
    `with check (true)` policies, `auth.uid() is not null` patterns
    that previously meant "anyone".
14. Vercel readiness assumptions (vite SPA, no server-side, env vars
    must be set in Vercel for each deployment).
15. Routing tree in `src/App.tsx`.

---

## D. Critical blockers

**D1. profiles.role privilege escalation primitive (FIXED IN THIS RUN — must be applied).**

- Source: migration 010 line 11 sets
  `role text not null default 'community_admin'`.
- Source: migration 010 lines 36–39 / 41–44 RLS policies allow any
  user to insert their own `profiles` row and don't constrain
  `role`.
- Source: migration 013 includes `community_admin` in
  `kigh_is_elevated_admin()`.
- Frontend trigger path: `src/pages/member/ProfilePage.tsx`
  auto-creates a profile row with no `role` field, so the column
  default applies — that profile is therefore elevated.
- Effect: any signed-in auth user becomes elevated admin on first
  profile load; if Supabase email signup is enabled, any internet
  user can become admin.
- Fix shipped in this run: `supabase/migrations/020_profiles_role_guard.sql`
  + a one-line addition to `src/lib/types.ts`. The migration:
  1. lowers the default to `'member'` (non-elevated);
  2. installs a `BEFORE INSERT/UPDATE` trigger
     (`kigh_profiles_role_guard()`) that demotes any non-admin
     attempt to set `role` to an elevated value;
  3. tightens the RLS WITH CHECK on the `profiles insert own` and
     `profiles update own or admin` policies as belt-and-braces;
  4. is idempotent — safe to apply to staging now and to the new
     production project later.

**Action required: apply 020 to staging BEFORE creating the
production project, then apply 001–020 to production. Do NOT push
020 to remote until the user confirms.**

No other critical blockers identified. The previously-flagged
`is_admin()` self-grant, anonymous-readable contact submissions,
private-document leaks, and gallery default-published holes are
already closed by 013, 018, 008, and 019 respectively.

---

## E. High-risk issues

**E1. Auth signup setting must be disabled for the new production project.**

The codebase contains no `supabase.auth.signUp(...)` call, so
account creation is entirely governed by the Supabase Auth
dashboard. Even with migration 020 applied, leaving "Allow new
users to sign up" enabled in production would let any internet
user create an auth user and a `'member'` profile, which is
harmless to admin RLS but undesirable for an invitation-only
admin tool. This must be turned OFF in the new production project,
and admin/board accounts must be created via the
`create-admin-user` Edge Function or via the Supabase dashboard
"Invite User" flow.

**E2. Staging Supabase project still has Auth signup setting unverified.**

Until 020 is applied to staging, the same self-elevation primitive
is reachable from the staging anon key. The staging URL+anon key
are in the local `.env` and would not normally be used by an
attacker, but the safe sequence is: apply 020 to staging first,
then create the production project.

**E3. `kigh-member-media` and `kigh-gallery-submissions` buckets
must be present in production.**

These two buckets are created by migration 012 with
`insert into storage.buckets ... on conflict do update`. That works
on a fresh project provided Storage is enabled. If Storage has not
been enabled in the new production Supabase project before
migrations are applied, the bucket inserts will fail and member
media uploads will silently break in production. Verify Storage is
turned on before pushing migrations.

**E4. Edge Functions must be deployed separately to production.**

`supabase/functions/create-admin-user` and `delete-admin-user`
require `SUPABASE_SERVICE_ROLE_KEY` to be set as a function env var
in the production project. They are not deployed by
`supabase db push`. Failing to deploy them means the
`/admin/users` page can't create new admins in production.

**E5. Edge Functions deploy and `service_role` must NEVER end up in
the frontend.**

Verified: no `VITE_SUPABASE_SERVICE_ROLE_KEY` reference exists in
`src/`. Only the Edge Function source files reference
`SUPABASE_SERVICE_ROLE_KEY` (server-side, Deno). Keep it that way.

---

## F. Medium-risk issues

**F1. `gallery_albums` / `gallery_images` schema does not match the
public `GalleryPage` query.**

- Migration 001 creates `gallery_albums` with columns
  `id, slug, name, description, cover_url, created_at` (no
  `title`, no `event_date`, no `is_published`, no `updated_at`).
- Migration 001 creates `gallery_images` with
  `id, album_id, image_url, caption, taken_at, status, created_at`
  (no `url`, no `thumbnail_url`, no `width`, no `height`, no
  `sort_order`, no `is_published`, no `uploaded_by`).
- `src/lib/types.ts` declares the richer model the UI assumes.
- `src/pages/public/GalleryPage.tsx` calls
  `from('gallery_albums').select('*').eq('is_published', true)` and
  `from('gallery_images').select('*').eq('is_published', true)
  .order('sort_order', ...)`. Neither column exists in the DB.
- Frontend then renders `img.url`, but the DB only stores
  `image_url`.
- Effect: the public gallery is silently broken everywhere —
  Supabase will either error on the unknown column or return an
  empty set, so the page shows the "No photos yet" empty state.
  Admin gallery (which uses the correct columns) works.
- Recommendation: this is **not a duplication blocker** because the
  break is identical between staging and production. Either ship a
  follow-up migration that adds the missing columns and a
  `is_published` view/column AND fix `GalleryPage.tsx`, OR fix the
  page to use the existing column names. Track in a separate PR
  before launch.

**F2. `BusinessTier` enum mismatch between DB and frontend.**

- DB enum (migration 001): `'basic', 'verified', 'featured', 'sponsor'`.
- Frontend `types.ts` `BusinessTier`:
  `'free' | 'verified' | 'featured' | 'sponsor'`.
- `SubmitBusinessPage` writes `tier: 'basic'` (correct for DB).
- `TierBadge` and admin `tierColor` map keys include both `'free'`
  and `'basic'`, so the badge falls back to undefined variant for
  rows with `tier='basic'` — cosmetic only, not a launch blocker.
- Recommendation: pick one canonical name (`'basic'` is already in
  prod data) and align `types.ts`, badges, and labels. Track as a
  cleanup, not a duplication blocker.

**F3. Strict tenant RLS is intentionally deferred.**

Migration 014 adds `community_id` columns and indexes but does
NOT add per-community RLS scoping on the legacy tables. This is
the documented "foundation only" scope (see
`docs/multi-community-domain-and-ads-foundation.md`). For a
single-community KIGH launch this is correct and safe. Once a
second community is onboarded, per-tenant RLS must be added before
that tenant's data is loaded.

**F4. `010_admin_user_security.sql` chair/secretary/treasurer
backfill is a no-op in production but resets `password_changed_at`
to NULL on staging if re-run.**

The `where u.email in (...)` filter selects 0 rows in a fresh
production project, so the backfill is harmless there. On staging,
re-running the migration would force a password rotation again on
those three pseudo-accounts. Acceptable for staging; document so
nobody is surprised.

**F5. ContactSubmission `category` field on the frontend.**

`src/lib/types.ts` declares `category: string` on
`ContactSubmission`, but the DB only has `inquiry_type` (post-018)
and the legacy `type` enum. The contact form sends `inquiry_type`
and `type`, never `category`. Cosmetic typings drift; no DB harm.

**F6. `src/lib/database.types.ts` is hand-written and stale.**

Comment in `src/lib/supabase.ts` calls this out explicitly. Not a
launch blocker — TypeScript untyped client is intentional — but
once the schema stabilises after launch, regenerate types from the
production project to get end-to-end type safety on admin code.

---

## G. Low-risk issues

**G1. Service-role key not present in `.env`** ✓ (good — keep it
that way; it should only live in Vercel env vars and the Supabase
dashboard).

**G2. `.env` is `.gitignore`d and not tracked.** ✓

**G3. `.env.example` defaults to `VITE_APP_ENV=development`** ✓
(safe default; staging and production templates explicitly set
their own value).

**G4. Supabase URL allow-list guard is opt-in** — when both
allow-list env vars are empty, the guard logs but does not block.
This is intentional ergonomics. In production, both
`VITE_PRODUCTION_SUPABASE_URLS` and `VITE_STAGING_SUPABASE_URLS`
should be populated so the guard is active.

**G5. `using (true)` / `with check (true)` audit:**
- `gallery_albums` SELECT `using (true)` (002): intentional public
  read on album metadata.
- `contact_submissions` INSERT `with check (true)` (002): replaced
  by 018 with constrained spam-resistant predicate. ✓
- `service_interests` INSERT `with check (true)` (011):
  intentional public submit; SELECT is admin-only.
- `community_governance_settings` SELECT `using (true)` (014):
  intentional — AGM/quorum policy fields are public.
None are security risks.

**G6. The `AuthContext` profile fetch on signed-in users may fail
silently if the profile row hasn't been created yet.** That's why
ProfilePage auto-creates it. With migration 020, that auto-create
correctly produces a `'member'` profile.

---

## H. Safe fixes applied in this run

Two files were modified, three new artifacts produced:

1. **NEW** `supabase/migrations/020_profiles_role_guard.sql`
   - Lowers `profiles.role` default to `'member'`.
   - Installs `kigh_profiles_role_guard()` BEFORE INSERT/UPDATE
     trigger that demotes non-admin attempts to set elevated roles.
   - Re-creates the `"profiles insert own"` policy with a
     belt-and-braces WITH CHECK.
   - Re-creates the `"profiles update own or admin"` policy so
     non-admins cannot change `role` via UPDATE.
   - Idempotent.

2. **MODIFIED** `src/lib/types.ts`
   - Added `'member'` to the `UserRole` union with a comment
     pointing at migration 020. `'member'` is intentionally NOT
     in `ELEVATED_ADMIN_ROLES`, so route guards continue to work.

3. **NEW** `docs/pre-duplication-surgical-environment-audit.md`
   (this file).

No commits, no pushes, no migration applies, no remote DB changes.

`git status` after this run should show only those three files
modified/added.

---

## I. Migration-chain assessment for fresh production

Read all 19 (now 20) files in order. A fresh Supabase project
running `supabase db push` against migrations 001 → 020 should
succeed cleanly subject to the manual prerequisites called out in
section S.

Highlights:

- **001** creates the base tables (`events`, `announcements`,
  `businesses`, `fundraisers`, `sports_posts`, `gallery_albums`,
  `gallery_images`, `contact_submissions`) and base enums
  (`content_status`, `verification_status`, `business_tier`,
  `contact_type`).
- **002** creates `is_admin()` (broken; repaired by 013) and the
  initial RLS policies, which 013 makes safe via the `is_admin()`
  rewire.
- **003** creates public buckets (`gallery`, `event-flyers`,
  `business-logos`, `fundraiser-images`) and their initial
  policies. Requires Storage to be enabled. 019 hardens these.
- **004** extends `events` and adds membership / household /
  payments / resources tables and the
  `submit_membership_registration` SECURITY DEFINER RPC. Public
  governance resources are seeded here as `access_level='public'`,
  `status='published'`. Production should review this seed before
  flipping DNS (the `seed.production.example.sql` already calls
  this out).
- **005–007** add seasonal events and back-fill resources for past
  events. Idempotent.
- **008** adds the private `kigh-private-documents` bucket and
  policies. Originally referenced `is_admin()` (now safe via 013);
  019 re-creates the policies against the canonical
  `kigh_is_elevated_admin()` helper for clarity.
- **009** community groups with public-safe RPC; correct.
- **010** profiles + admin_user_profiles + view; the role-default
  hole is closed by 020.
- **011** service_interests; correct.
- **012** member profiles extension, member media, profile
  household, plus private storage buckets `kigh-member-media` and
  `kigh-gallery-submissions`. Requires Storage. Adds the
  initial `kigh_is_elevated_admin()` (013 expands it).
- **013** is the security-repair migration — safe to re-run.
- **014** adds the multi-community foundation and seeds the
  default KIGH community + governance settings. Idempotent.
- **015** adds `audit_logs` + writer RPC. Correct.
- **016** adds member auth-link + good-standing fields + AGM
  quorum view + `kigh_link_member_to_user` admin RPC. The
  member-self-update WITH CHECK uses Postgres' standard "subquery
  reads OLD row" pattern — verified correct.
- **017** community_ads + public listing RPC + ads_manager role
  semantics. Correct.
- **018** contact_submissions schema alignment + status sync
  trigger + tightened insert WITH CHECK. Idempotent. The honeypot
  contract (frontend hidden field + DB `honeypot=''` predicate) is
  intact.
- **019** gallery default → pending + public-bucket admin policies
  switched to `kigh_is_elevated_admin()`. Correct.
- **020** (this run) profiles role guard.

Order safety: every helper function referenced by a later policy
exists before that policy is created — verified pairwise. Tables
referenced by 014's `add column if not exists community_id` all
exist by 012/004.

The chain has no `drop table`, no `truncate`, no destructive `drop
column`, no destructive `drop policy` without a recreate. The
chain is safe to apply to a fresh project.

---

## J. RLS / security assessment

Confirmed (by reading the migration source — not by executing
against the live DB):

- `is_admin()` now delegates to `kigh_is_elevated_admin()` (013)
  and is no longer satisfied by any signed-in user. ✓
- `kigh_is_elevated_admin()` reads `profiles.role` with a fixed
  allowed-list. ✓
- `kigh_is_platform_super_admin()` is the strictest helper and is
  used by `community_admin_roles` and `communities` write policies.
- `community_admin_roles` write is gated by
  `kigh_is_platform_super_admin()` only. ✓
- `community_admin_roles` cannot be inserted/updated by ordinary
  authenticated users.
- Public reads on `events`, `announcements`, `businesses`,
  `fundraisers`, `sports_posts` only return rows where
  `status = 'published'`. ✓
- Public reads on `gallery_images` only return rows where
  `status = 'published'`. ✓ (with 019 changing the default for new
  rows to `'pending'`).
- Public cannot SELECT `contact_submissions`, `members`,
  `household_members`, `membership_payments`, `service_interests`,
  `audit_logs`, `community_admin_roles` (other than self),
  `member_media_submissions` (other than own), or
  `profile_household_members` (other than own).
- Anonymous INSERT is allowed on:
  `events`, `announcements`, `businesses`, `fundraisers` (with
  `status='pending'` predicate — 002),
  `contact_submissions` (with constrained spam-resistance check —
  018),
  `community_groups` (with `status='pending'`),
  `service_interests` (open insert — admin-only read).
- Storage `kigh-private-documents` is private and admin-only. ✓
- Storage `kigh-member-media` and `kigh-gallery-submissions` are
  private and require the first path segment to equal
  `auth.uid()`. ✓
- Storage public buckets only allow elevated-admin write (019). ✓
- After 020: `profiles` cannot be self-elevated. ✓

Mandatory live checks before flipping DNS are in section S; the
existing `docs/staging-rls-security-fix-validation.md` is the
authoritative SQL pack.

---

## K. Admin / auth assessment

- `AdminLoginPage` and `MemberLoginPage` both call
  `signInWithPassword`. There is **no `signUp` call anywhere in
  the frontend**. Account creation is entirely governed by Supabase
  Auth dashboard settings + the `create-admin-user` Edge Function.
- `ProtectedRoute` requires authenticated session AND
  `isElevatedAdminRole(profile.role)` AND the AuthContext
  `isAdmin` flag (which is the same predicate). ✓
- `RequireAuth` only requires authentication; used for
  member-only pages (`/profile`, `/profile/media`).
- `AuthContext` fetches `admin_user_profiles` separately to drive
  the password-rotation gate. The fetch has a 12-second timeout
  with explicit fail-closed. ✓
- The frontend `UserRole` union and `ELEVATED_ADMIN_ROLES` array
  are kept in sync with `kigh_is_elevated_admin()`. Verified after
  this run.
- Role names match between DB (013, 014, 017) and types.ts after
  the `'member'` addition. `ads_manager` is consistently included
  in `ADS_MANAGER_ROLES`, the 014 `community_admin_roles` check
  constraint, and the 017 ads policies.

No broken admin-route paths found.

---

## L. Membership / family assessment

Production-ready today:

- Public `MembershipPage` posts via `submit_membership_registration`
  RPC (DEFINER, idempotent on inputs, validates required fields,
  consent, and membership type).
- Admin `AdminMembersPage` lists members with household joins and
  supports status / dues / good-standing updates.
- `members.user_id` link, good-standing flags, AGM/quorum view,
  and the `kigh_link_member_to_user` admin RPC are in place
  (016).
- Self-service member RLS prevents members from changing their own
  `membership_status` / `dues_status` / `good_standing` (016).

Foundation only — needs follow-up UI before being heavily used:

- Member-side UI to view application status / good-standing /
  payment receipts is not built.
- Family / household self-edit UI is partial: profile page
  household exists (`profile_household_members`) but it is a
  parallel model to `household_members` on the admin side. They
  do not currently sync. This is acceptable for launch as long as
  the canonical "household" for governance is the admin-side
  `members + household_members` model, which it is.
- AGM/quorum runtime views on the public `GovernancePage` use
  static text — they don't yet call `kigh_agm_quorum_required`.
  Again, foundation is in place; UI can land post-launch.

None of these block production duplication.

---

## M. Contact / media / storage assessment

- Contact form (`ContactPage`): post-018 schema alignment, honeypot
  in DOM + DB predicate, sends both `inquiry_type` (new) and
  `type` (legacy enum). DB trigger keeps `is_read` in sync with
  `status`. Admin contacts page reads both. End-to-end behaviour
  verified by reading code paths — should work in production.
- Gallery: admin path uses correct columns; public path is broken
  (F1) but launch-non-blocking.
- Member media: `member_media_submissions` defaults to `'pending'`,
  storage path is namespaced by `auth.uid()`, admin moderation
  flow exists. ✓
- Private documents: `kigh-private-documents` admin-only, RLS
  policies repaired by 019. ✓
- Public buckets: write policies tightened to elevated admin in
  019. ✓
- **Bucket creation is performed by SQL migrations (003, 008,
  012). Storage must be enabled in the production project before
  pushing migrations**, otherwise these inserts will fail.

---

## N. Multi-community / domain assessment

- `communities`, `community_domains`, `community_admin_roles`,
  `community_governance_settings` exist (014).
- Default KIGH community is seeded by 014 AND idempotently by
  `seed.production.example.sql`. Either path is safe.
- Per-table `community_id` columns are added with the KIGH default
  as the column default + backfill, so legacy queries that omit
  `community_id` continue to work.
- Strict per-tenant RLS is deferred. Acceptable for single-community
  KIGH launch (F3).

Sufficient foundation for "KIGH launches first; other communities
can be onboarded later, each with their own primary domain". The
custom-domain mapping itself happens in Vercel / DNS, not in this
codebase.

---

## O. Ads / sponsorship assessment

- `community_ads` table (017) with full RLS, indexes, and
  `list_active_community_ads` public RPC.
- `ads_manager` role plumbed end-to-end (DB + types.ts).
- **No frontend wiring yet.** No public component calls
  `list_active_community_ads`. No admin page manages ads.
- Recommendation: ads can wait until after production launch. The
  schema is forward-compatible. When the UI is added, no migration
  is needed.

Not a duplication blocker.

---

## P. Seed / data strategy assessment

- `supabase/seed.sql` is loud-marked **LOCAL/DEMO ONLY** with a
  warning header. Used by Playwright e2e and local dev only.
- `supabase/seed.production.example.sql` only asserts the default
  KIGH community, primary domain, and governance settings. No
  fake data, no auth users, no bucket flips.
- Migration 014 already inserts the default KIGH community. The
  production seed is technically redundant; it exists as
  documentation and as a re-assertion before launch. Both paths
  are idempotent.

Recommendation: do NOT run `seed.sql` against production. Apply
migrations 001–020 + (optionally) `seed.production.example.sql`,
nothing else, then create the first super-admin via the dashboard
or `create-admin-user` Edge Function.

---

## Q. Vercel / environment variable checklist

Vercel project setup (recommendation — to be performed in the
Vercel dashboard, not by this audit):

For the **staging** Vercel deployment (current `main` branch
deploys, until a `staging` branch is created):

- `VITE_APP_ENV=staging`
- `VITE_SUPABASE_URL=<staging-supabase-url>`
- `VITE_SUPABASE_ANON_KEY=<staging-anon-key>`
- `VITE_PRODUCTION_SUPABASE_URLS=<production-supabase-url>` (set
  AFTER the production project exists, so the guard is active)
- `VITE_STAGING_SUPABASE_URLS=<staging-supabase-url>`
- `VITE_APP_URL=https://staging.kenyancommunityhouston.org`
  (or the actual staging domain)
- `VITE_APP_NAME=Kenyan Community Houston (Staging)`
- `VITE_SITE_NAME=Kenyan Community Houston`
- `VITE_CONTACT_EMAIL=staging@kenyancommunityhouston.org`

For the **production** Vercel deployment:

- `VITE_APP_ENV=production`
- `VITE_SUPABASE_URL=<production-supabase-url>`
- `VITE_SUPABASE_ANON_KEY=<production-anon-key>`
- `VITE_PRODUCTION_SUPABASE_URLS=<production-supabase-url>`
- `VITE_STAGING_SUPABASE_URLS=<staging-supabase-url>`
- `VITE_APP_URL=https://kenyancommunityhouston.org`
- `VITE_APP_NAME=Kenyan Community Houston`
- `VITE_SITE_NAME=Kenyan Community Houston`
- `VITE_CONTACT_EMAIL=info@kenyancommunityhouston.org`

Build settings: `vite build` → output `dist/`. SPA fallback:
Vercel auto-detects Vite SPA; if not, add a `vercel.json`
rewrite of `/(.*) → /index.html`. None is currently committed —
verify with the actual staging deploy on a deep-link refresh
(e.g. `/about`, `/admin/login`).

Branch strategy recommendation:

- `main` → production Vercel project (after cutover).
- `staging` → staging Vercel project. Create the `staging` branch
  from current `main` BEFORE the cutover so staging stops moving
  when production goes live.
- `feature/*` → preview deployments; should NEVER point at
  production env vars (Vercel preview deploys inherit Production
  env by default — override with Preview-scoped vars).

---

## R. Production duplication checklist

Use this in order when ready to duplicate. Do NOT execute any of
these from the audit run.

1. Apply migration 020 to staging (`supabase migration up --linked`
   against staging) and re-run the validation pack in
   `staging-rls-security-fix-validation.md`.
2. Smoke-test staging: admin login still works, member login still
   works, contact form still works, profile auto-create still
   produces a `'member'` profile (not `community_admin`).
3. Tag `main` as `pre-production-cutover` and create a `staging`
   branch from `main`.
4. Create the new Supabase production project. Pick a region
   (recommend `us-west-2` to match staging or the closest US
   region to Houston). Enable Auth and Storage immediately.
5. In production Auth → Providers → Email: **disable signups** and
   require email confirmation if you keep magic links off.
6. Enable PITR (point-in-time recovery) on production from day 1.
7. Run `supabase db push --linked` against the new production
   project for migrations 001 → 020.
8. Optionally run `supabase/seed.production.example.sql` (it is
   idempotent with migration 014; safe to skip).
9. Deploy the two Edge Functions to production with
   `SUPABASE_SERVICE_ROLE_KEY` set in the function env.
10. Create the first super_admin via Supabase dashboard "Invite"
    or `create-admin-user`. Force password rotation on first
    login (the existing `admin_user_profiles.must_change_password`
    flow handles this).
11. Set production Vercel env vars as in section Q.
12. Trigger a production Vercel deployment from `main`. The
    staging banner must NOT appear.
13. Smoke-test production on the Vercel-assigned URL **before**
    flipping DNS:
    - homepage loads, no banner.
    - admin login + dashboard work.
    - contact form submits.
    - submit-event / submit-business / submit-fundraiser pages
      accept submissions and route them to `pending`.
    - membership form submits via RPC.
    - private resources are NOT visible to anonymous viewers.
    - private documents bucket gives 401/403 to anonymous
      requests.
    - re-run the RLS validation pack against production (same
      script, swap project ref).
14. Only then, point `kenyancommunityhouston.org` DNS at the
    production Vercel project. Keep `staging.kenyancommunityhouston.org`
    (or equivalent) on the staging project.

Rollback plan: if production fails smoke tests, leave DNS
unchanged. Production sits idle. Staging keeps serving. Investigate,
fix, re-apply.

---

## S. Manual dashboard checks before production

These cannot be automated by this repo and must be performed in
the Supabase dashboard (production project) before opening to
real users:

- Auth → Providers → Email: signups OFF, confirmations as desired.
- Auth → URL Configuration: set Site URL to
  `https://kenyancommunityhouston.org`. Set Redirect URLs allow-list.
- Auth → Rate limits: defaults are fine; raise sign-in attempt
  limit only if needed.
- Storage: confirm enabled BEFORE pushing migrations. Confirm
  buckets exist after pushing: `gallery`, `event-flyers`,
  `business-logos`, `fundraiser-images`, `kigh-private-documents`,
  `kigh-member-media`, `kigh-gallery-submissions`.
- Database → Backups: PITR ON, retention ≥ 7 days.
- Database → Roles: confirm `anon` and `authenticated` have
  default schema usage.
- Project settings → API: rotate the service-role key once after
  initial setup if you copy/paste anywhere. Store in 1Password.
- Edge Functions: deploy `create-admin-user` and
  `delete-admin-user`; set `SUPABASE_SERVICE_ROLE_KEY`.
- Run RLS validation pack from
  `staging-rls-security-fix-validation.md` against production.
- Verify the public gallery / events / businesses / fundraiser
  pages show the expected (empty or curated) content — i.e. no
  staging data leaked in.

---

## T. Go / no-go verdict

**Go**, conditional on:

1. Migration 020 applied to staging first and validated.
2. Section S manual dashboard checks completed on the new
   production project before DNS flip.
3. Section R duplication checklist followed in order.

The remaining medium / low risks (gallery public-page schema
mismatch F1, business-tier label F2, deferred per-tenant RLS F3,
hand-written types F6) do not block duplication. Track them as
follow-up PRs.

---

## U. Exact next commands the user should run

(Audit-run output only — do NOT execute these from this run. Each
is a recommended next step for the user.)

```bash
# 0) Inspect the new migration and the typings change.
git status
git diff src/lib/types.ts
cat supabase/migrations/020_profiles_role_guard.sql

# 1) Commit the safe-fix migration + types update on a hardening branch.
git checkout -b hardening/profiles-role-guard
git add supabase/migrations/020_profiles_role_guard.sql src/lib/types.ts \
        docs/pre-duplication-surgical-environment-audit.md
git commit -m "harden profiles.role default and self-elevation guard"

# 2) Apply 020 to STAGING only (current linked project).
supabase migration list --linked
supabase migration up --linked
# Re-run the validation pack:
#   docs/staging-rls-security-fix-validation.md

# 3) After validation passes on staging, merge the branch to main
#    and create a staging branch from main:
git checkout main
git merge --ff-only hardening/profiles-role-guard
git push origin main
git checkout -b staging
git push origin staging

# 4) STOP here and review section R + section S before creating
#    the new Supabase production project.
```

The user has explicitly asked us not to push migrations or commit.
The block above is what to do **after** this audit, not part of
this run.

---

## Final summary for the user

1. **Can we create the clean production Supabase project now?**
   Not safely — apply migration `020_profiles_role_guard.sql` to
   the current staging project first, validate, then duplicate.
2. **Were code changes made?** Yes, two:
   - new `supabase/migrations/020_profiles_role_guard.sql`
   - `src/lib/types.ts` adds `'member'` to the `UserRole` union
   - new `docs/pre-duplication-surgical-environment-audit.md`
3. **Did the build pass?** The user reported `npm run build`
   passes locally. The audit's Linux sandbox cannot reproduce the
   build because `node_modules` is darwin-specific. No code change
   in this run could plausibly break the build (one new SQL file,
   one additive type union member with no existing exhaustive
   `Record<UserRole, …>` consumer that lacks a `member` key —
   verified by inspection: no consumer uses `Record<UserRole, …>`
   with exhaustive checking).
4. **What still must be checked manually?** Section S items —
   especially: disable Auth signups in the new production
   project; enable Storage before pushing migrations; deploy the
   two Edge Functions; run the RLS validation pack against
   production before DNS.
5. **Exact next command / dashboard action:**
   Apply migration 020 to staging (`supabase migration up --linked`
   against the staging project) and re-run
   `docs/staging-rls-security-fix-validation.md` against staging.
   Only after that passes, proceed to create the new production
   Supabase project per section R.
