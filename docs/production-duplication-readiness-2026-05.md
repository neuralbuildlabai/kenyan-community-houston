# Production Duplication Readiness — May 2026 Run

This document is the live punch-list for duplicating the current
staging/UAT environment into a clean production Supabase project
for the Kenyan Community Houston (KIGH) launch. It supplements
`docs/pre-duplication-surgical-environment-audit.md` and
`docs/production-cutover-checklist.md` with the additional
hardening that landed in this run.

---

## A. What this run changed (no commits, no remote applies)

1. `supabase/functions/create-admin-user/index.ts` — replaced the
   single flat `ASSIGNABLE_ROLES` list with a server-side caller-
   role-aware matrix. `community_admin` can no longer assign
   `super_admin` or `platform_admin` (or even `community_admin`).
   `platform_admin` can assign operational roles but not
   `super_admin` / `platform_admin`. Only `super_admin` can assign
   `super_admin` and `platform_admin`. Self-modification via this
   endpoint is rejected with HTTP 422. Caller role is read from
   `profiles.role` (DB), never from `user_metadata`.

2. `src/lib/adminRoleMatrix.ts` — new frontend mirror of the same
   matrix. The Admin Users page reads from this so the UI never
   surfaces options the backend will reject.

3. `src/pages/admin/UsersPage.tsx` — role picker now uses
   `assignableRolesForCaller(profile.role)`. Caller-role gate
   (`canInviteAdminUsers`) hides the invite form for non-eligible
   admins. Backend errors are surfaced verbatim to the operator.

4. `e2e/tests/admin-role-governance.spec.ts` — Playwright unit-style
   tests for the matrix. Live Edge Function tests are NOT included
   because they would require service-role keys and a live
   Supabase project; document below which assertions are pure
   logic and which still need a manual / smoke test.

5. `scripts/admin/create-uat-users.mjs` — sanitized:
   - Hard-coded weak password `'123456!'` removed.
   - Hard-coded tester email list removed.
   - Refuses to run unless `KIGH_ENV=staging|uat`.
   - Refuses to run if `VITE_APP_ENV/APP_ENV/NODE_ENV` is
     `production`.
   - Refuses to run if `SUPABASE_URL` matches
     `KIGH_PRODUCTION_PROJECT_REF` or any URL in
     `KIGH_PRODUCTION_SUPABASE_URLS`.
   - Refuses to create UAT accounts under real-looking domains
     (`gmail.com`, `kenyancommunityhouston.org`, etc.).
   - Refuses to create `super_admin` / `platform_admin` UAT users.
   - Caller must supply `UAT_TEMP_PASSWORD` (≥12 chars) or pass
     `--generate` to create a one-shot strong password printed
     to stdout.
   - Tester list comes from `UAT_USER_LIST` env or
     `--users-file <path>` JSON.

6. `.gitignore` — `scripts/admin/clear-admin-password-gate.mjs`,
   `scripts/admin/clear-uat-password-force.mjs`,
   `scripts/admin/local-*.mjs`, and `scripts/admin/*.local.mjs`
   are now explicitly ignored so local helpers can't be committed
   accidentally with hard-coded UAT identities.

7. `docs/production-duplication-readiness-2026-05.md` — this file.

8. `docs/production-bootstrap-super-admin.md` — explicit, env-
   guarded bootstrap path for `admin@kenyancommunityhouston.org`.

9. `scripts/admin/bootstrap-super-admin.mjs` — production-safe
   helper that promotes an existing auth user (created via
   Supabase Dashboard → Invite) to `super_admin`. Requires
   `KIGH_ENV=production` and an explicit
   `KIGH_PRODUCTION_CONFIRM=YES_I_AM_BOOTSTRAPPING_PRODUCTION`
   sentinel before it will run.

10. `supabase/seed.production.example.sql` — extended with an
    explicit "do NOT copy 005/006/007 events into production
    unless they are part of the day-1 calendar" comment.

No migrations were rewritten. Migration history (001–024) is
preserved exactly because it has already been applied to staging
and any rewrite would diverge the two histories.

---

## B. Final role assignment matrix (authoritative)

| Caller            | super_admin | platform_admin | community_admin | content_manager | membership_manager | treasurer | media_moderator | ads_manager | business_admin | support_admin | moderator | viewer | member |
|-------------------|:-----------:|:--------------:|:---------------:|:---------------:|:------------------:|:---------:|:---------------:|:-----------:|:--------------:|:-------------:|:---------:|:------:|:------:|
| `super_admin`     | ✅          | ✅             | ✅              | ✅              | ✅                 | ✅        | ✅              | ✅          | ✅             | ✅            | ✅        | ✅     | ✅     |
| `platform_admin`  | ❌          | ❌             | ✅              | ✅              | ✅                 | ✅        | ✅              | ✅          | ✅             | ✅            | ✅        | ✅     | ✅     |
| `community_admin` | ❌          | ❌             | ❌              | ❌              | ❌                 | ❌        | ✅              | ✅          | ✅             | ✅            | ✅        | ✅     | ✅     |
| any other         | ❌          | ❌             | ❌              | ❌              | ❌                 | ❌        | ❌              | ❌          | ❌             | ❌            | ❌        | ❌     | ❌     |

Notes:
- `platform_admin` cannot create another `platform_admin`. If a
  product rule later allows this, it must be added explicitly to
  `assignableRolesForCaller('platform_admin')` in BOTH the Edge
  Function and the frontend matrix.
- `community_admin` cannot create peer `community_admin` accounts
  (no peer creation). Top-level governance roles
  (`content_manager`, `membership_manager`, `treasurer`) are
  intentionally reserved for `platform_admin`+ to avoid quietly
  giving a community admin levers it has no audit trail for.
- Self-modification through this endpoint is rejected with HTTP
  422 regardless of role.

---

## C. Migration / seed content posture

- Migrations 001 → 024 are applied to staging today. Do **not**
  rewrite or delete any of them in this run. Migration history is
  the contract with every Supabase project that has already
  applied a prefix of the chain.
- Migrations 005 / 006 / 007 publish real-looking KIGH events
  (Family Fun Day, Financial Literacy Session) and back-fill
  resource links into the production-bound DB. For the new
  production project:
  * If those events should be live on day-1, apply 005/006/007.
  * If not, apply only 001 → 004 + 008 → 024 *or* apply
    005/006/007 then archive the inserted rows (`update events
    set status='archived' where slug in ('kigh-family-fun-day-2026',
    'kigh-financial-literacy-session-2026-04-24');`).
  * Decision must be made before DNS flip. Track it in the cutover
    checklist.
- `supabase/seed.sql` is **never** to be applied to production.
  It contains fictional people/businesses/fundraisers and is
  flagged with a banner.
- `supabase/seed.production.example.sql` is the only seed that may
  touch production. It only asserts the default KIGH community,
  primary domain, and AGM/quorum settings. Idempotent with
  migration 014.

---

## D. Production duplication checklist (must run in order)

These are the steps the operator must perform. The repo is
ready for review; nothing below has been executed by this run.

### D1. Pre-duplicate

1. Apply migrations 020 → 024 to staging if not already applied
   (`supabase migration list --linked` to confirm; the audit
   reports 001 → 024 are applied).
2. Re-run `docs/staging-rls-security-fix-validation.md` against
   staging. All RLS predicates must still pass.
3. Tag `main` as `pre-prod-cutover-2026-05`.

### D2. Create the production Supabase project

4. Provision a new Supabase project `kch-production` (region: us-
   west-2 or closest US to Houston).
5. Enable Storage **before** running migrations. Migrations 003,
   008, 012, 023 create buckets. If Storage is not enabled the
   inserts fail.
6. Auth → Providers → Email: **disable signup**. Admin invites
   only (Edge Function or dashboard Invite).
7. Enable PITR (point-in-time recovery) ≥ 7 days.

### D3. Apply migrations to production

8. `supabase link --project-ref <production-ref>`
9. `supabase migration list --linked` → expect the chain to be
   empty.
10. `supabase db push` to apply 001 → 024 in order. Decide
    per § C whether to skip / archive 005/006/007 events.

### D4. Production bootstrap data

11. Apply `supabase/seed.production.example.sql` once via the
    Supabase SQL editor.
12. Optionally archive seeded events (per § C).
13. Do **not** copy any data from staging:
    - no `auth.users`
    - no `profiles`
    - no `members`
    - no `household_members`
    - no `contact_submissions`
    - no `service_interests`
    - no `analytics_events`
    - no `audit_logs`
    - no `community_admin_roles` (other than what 014 seeds)
    - no `member_media_submissions`
    - no `gallery_images` / `gallery_albums`
    - no storage objects in any bucket
    - no UAT auth users (`*@kighuat.test`)
    - no admin_user_profiles rows

### D5. Edge Functions

14. Deploy `supabase/functions/create-admin-user` and
    `supabase/functions/delete-admin-user` to production.
15. Set `SUPABASE_SERVICE_ROLE_KEY` in the function env
    (Supabase Dashboard → Functions → Secrets).
16. Verify the function `assignableRolesForCaller` matrix matches
    the deployed source (run `supabase functions list` and confirm
    deploy hash).

### D6. First super admin

17. In Supabase Dashboard → Auth → Users, create
    `admin@kenyancommunityhouston.org` via the **Invite User**
    flow. Set a strong temporary password manually (≥ 16 chars,
    do not commit). Do NOT use the staging password.
18. Run `scripts/admin/bootstrap-super-admin.mjs` against the
    production project (see `docs/production-bootstrap-super-admin.md`)
    to flip the profile to `super_admin` and seed the
    `admin_user_profiles` row with `must_change_password=true`.
19. Sign in once at `/admin/login` with the temporary password.
    The force-rotate flow will require a new password before the
    dashboard loads.

### D7. Vercel production project

20. Create a `kch-production` Vercel project pointing at the same
    GitHub repo.
21. Set production env vars from `.env.production.example`:
    - `VITE_APP_ENV=production`
    - `VITE_SUPABASE_URL=<production-ref-url>`
    - `VITE_SUPABASE_ANON_KEY=<production-anon-key>`
    - `VITE_PRODUCTION_SUPABASE_URLS=<production-ref-url>`
    - `VITE_STAGING_SUPABASE_URLS=<staging-ref-url>`
    - `VITE_APP_URL=https://kenyancommunityhouston.org`
    - `VITE_APP_NAME=Kenyan Community Houston`
    - `VITE_SITE_NAME=Kenyan Community Houston`
    - `VITE_CONTACT_EMAIL=info@kenyancommunityhouston.org`
22. Trigger a production build. The runtime guard in
    `src/lib/supabase.ts` should not throw. Staging banner must
    not appear.

### D8. Smoke test before DNS flip

23. Sign in as `admin@kenyancommunityhouston.org`. Verify role is
    `super_admin`.
24. Verify Admin Users page lists every assignable role
    (including `platform_admin`).
25. Sign in (in a separate browser session) as a freshly created
    `community_admin` and verify only the operational roles are
    visible in the role picker. Verify direct API call to
    `create-admin-user` with `role: 'super_admin'` returns 403.
26. Verify System Health link is hidden for `community_admin`
    and visible for `super_admin`.
27. Submit one of each public form (event, business, announcement,
    fundraiser, contact, membership) and verify rows land
    `pending`. Approve via admin and verify they publish.
28. Upload a flyer to `event-flyers` and a private doc to
    `kigh-private-documents` and verify access boundaries.
29. Open a published event with a calendar address and verify the
    Google Maps link points to the address.
30. Confirm no staging banner appears anywhere.

### D9. Cut over

31. Lower DNS TTL to 300s 24 hours before cutover.
32. Point `kenyancommunityhouston.org` at `kch-production` in
    Vercel.
33. Watch logs / RLS validation pack for the first 24 h.

---

## E. Rollback / abort triggers

Abort the cutover if any of:

- `supabase db push` against production fails for any migration in
  001–024.
- The Edge Functions return 500 on a known-good super_admin call.
- `bootstrap-super-admin.mjs` reports the auth user does not exist
  or refuses to run.
- Any RLS check from
  `docs/staging-rls-security-fix-validation.md` fails against
  production.
- The staging banner appears on the production URL.
- `community_admin` or anonymous can read any
  `contact_submissions`, `members`, or `audit_logs` row.

---

## F. Honest residual risks (not closed by this run)

- Live Edge Function role-governance assertions still need to be
  exercised against production after deploy. The unit tests in
  `e2e/tests/admin-role-governance.spec.ts` cover the pure matrix
  logic only — they do not call the deployed function.
- Migration `024_admin_analytics_and_health.sql` is the latest
  migration on disk. If staging has 024 applied and production is
  fresh, both will land at the same revision after `db push`.
  Verify with `supabase migration list --linked` against both.
- Some helper scripts (`scripts/admin/clear-*.mjs`) remain
  untracked on the operator's machine. They are now explicitly
  `.gitignore`'d so they can't be committed by accident, but they
  still contain hardcoded UAT email strings. Treat them as
  ephemeral local tools; delete after UAT ends.
- The frontend matrix in `src/lib/adminRoleMatrix.ts` is hand-
  synchronised with the Edge Function. A future role addition has
  to land in both files; the Playwright test suite will catch any
  visible drift, but a backend-only rule change (e.g. an explicit
  product decision to allow `platform_admin` to create another
  `platform_admin`) will need an intentional matrix update in
  both places.

---

## G. What is explicitly NOT done in this run

- No `git add`, `git commit`, `git push`.
- No `supabase db push`.
- No `supabase functions deploy`.
- No remote-DB writes.
- No environment variable changes in Vercel.
- No DNS changes.
- No deletion of any existing UAT account, staging user, or
  staging row.
