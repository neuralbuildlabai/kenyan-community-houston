# Staging → Production Duplication: Brutal Assessment

Project: Kenyan Community Houston (KIGH) – React/Vite + Supabase
Audit date: 2026-05-04
Scope: Full code + DB readiness audit prior to setting current instance as STAGING/UAT and creating a clean PRODUCTION instance.
No code, schema, env vars, or remote state were modified by this audit.

---

## A. Executive verdict

**NOT READY** to duplicate as-is.

The current Supabase instance has a **wide-open authentication-equals-admin RLS contract** (`is_admin()` returns true for any signed‑in user), several **schema/code mismatches** that almost certainly cause runtime failures (contact submissions, gallery default status), a **private-documents bucket that any authenticated user can read**, **fake/test seed data** baked into the codebase, **no environment separation** (single `.env`, no staging banner, no `VITE_APP_ENV`), **no real link between membership applications and auth/profile self-service**, and **no AGM/quorum/good-standing data model** despite governance copy that promises it.

The right path is exactly what you proposed: keep the current instance as STAGING/UAT, fix the blockers in code+migrations, and stand up a **clean** production Supabase project from migrations only — no seed.sql, no copied rows.

---

## B. Current architecture summary

- Frontend: React 18 + TypeScript + Vite (SPA, client-side routing via React Router v6). No SSR, no server-rendered pages, no edge middleware. Build output: `dist/` deployed via Vercel.
- UI: Tailwind + shadcn/ui (Radix), Sonner toasts, react-helmet-async for SEO.
- Backend: Supabase (PostgreSQL 15, Auth, Storage). Two Edge Functions: `create-admin-user`, `delete-admin-user` (require `SUPABASE_SERVICE_ROLE_KEY`).
- Auth: email + password only. No OAuth, no magic link, no MFA. Both `/admin/login` and `/login` use `signInWithPassword`. There is **no client-side `signUp` call anywhere**, so account creation is governed by Supabase Auth dashboard settings (which the audit cannot inspect).
- Routing: `App.tsx` defines public routes under `PublicLayout`, member-protected routes via `RequireAuth`, and admin routes under `ProtectedRoute → AdminLayout` (which adds an admin password-rotation gate).
- Branches: only `main` (local + remote). No `staging`, no `develop`, no protection ruleset evidence.
- Env: single `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_APP_NAME`, `VITE_SITE_NAME`, `VITE_CONTACT_EMAIL`. **No `VITE_APP_ENV`, no staging banner, no production-specific overrides, no `.env.production.example`.**
- Tests: Playwright e2e suite (~16 spec files). No unit tests, no DB-level RLS tests, no migration tests, no CI config in repo.
- Migrations: 12 SQL files in `supabase/migrations/` (1641 lines). `supabase/seed.sql` (137 lines) is **fake demo data**.
- Local-only sensitive folder `kigh-private-review/` (admin, contacts, finance, minutes, sensitive) is gitignored — confirmed not tracked by git, but is present on the developer machine. Treat as out-of-band; do not include in any deploy artifact.

---

## C. Critical blockers (must fix before production)

C1. **`is_admin()` is a fake admin check.**
`supabase/migrations/002_rls_policies.sql:18-23` defines `is_admin()` as `return auth.uid() is not null`. Every "Admins have full access" policy on `events`, `announcements`, `businesses`, `fundraisers`, `sports_posts`, `gallery_albums`, `gallery_images`, `contact_submissions`, `members`, `household_members`, `membership_payments`, `resources` (and 008 storage policies on `kigh-private-documents`) collapses to "any authenticated user has full read/write." Migration 012 introduced the correct check (`kigh_is_elevated_admin()` which validates `profiles.role` against the admin role list) but only used it on `profile_household_members`, `member_media_submissions`, `kigh-member-media`, and `kigh-gallery-submissions`. Everything else is unfixed. **Effect:** if Supabase Auth allows public sign-up (or if any non-admin has been issued credentials, e.g. a board member or volunteer), they have full DB-admin powers via RLS.

C2. **`kigh-private-documents` bucket is readable/writable by any authenticated user.**
`supabase/migrations/008_kigh_private_documents.sql:35-46` uses `is_admin()` for select/insert/update/delete. Combined with C1, this is a real data-leak vector for whatever lives in that bucket (treasurer/board documents, by intent of the migration comment).

C3. **Schema/code mismatch on `contact_submissions` will silently drop fields.**
The `contact_submissions` table (`001_initial_schema.sql:163-175`) has columns `name, email, subject, message, type, is_read, created_at`. The public form `src/pages/public/ContactPage.tsx:26` does `insert([{ ...form, status: 'new' }])` where `form` includes `phone` and `inquiry_type`. The admin `ContactsPage.tsx` reads `is_read`/`type`. PostgREST will reject inserts with unknown columns by default; if it doesn't, the data is being lost. Without a successful test against the real DB, this contact form is unverified at best.

C4. **Test/demo seed data is in the repo and the README instructs people to run it.**
`supabase/seed.sql` inserts fictitious businesses (`Mama Africa Catering`, `Nairobi Insurance Group`, `Savanna Hair & Beauty Salon`), fictitious fundraisers naming individuals (`Wanjiku Family`, `John Kamau`), and fake events. Cloning the database into production would publish fake people and fake fundraisers under the KIGH name. README §4 explicitly tells the user to run `supabase/seed.sql`.

C5. **Membership applications are not linked to authenticatable members.**
`members` rows are created by the public `submit_membership_registration(jsonb)` RPC (anon-callable). They have no `user_id` foreign key to `auth.users`. `profiles` (and `profile_household_members`) is the auth-linked side. There is no bridge: a person who applies for membership cannot ever log in to view/edit their own application, household, or dues status. Member self-service does not exist for the membership pipeline.

C6. **No AGM / quorum / good-standing data model exists.**
Governance copy (`src/pages/public/GovernancePage.tsx`) advertises "AGM held in November" and "quorum is 25% of members in good standing." There is no `good_standing` boolean, no AGM entity, no quorum calculation, no member-since/term-end logic. The site promises governance behaviour that the database cannot enforce or report on.

C7. **No environment separation in code or env files.**
There is one `.env`. There is no `.env.production.example`, no `VITE_APP_ENV`, no staging banner component, no environment-aware Supabase URL guard. Mistakes (running staging build against prod DB or vice versa) will be silent. Vercel project may have separate env vars — that cannot be verified from the repo, but the **app code has no defense-in-depth** to refuse the wrong DB.

C8. **`is_admin()` is referenced in admin-only Storage policies but resolves to "any authed user."**
Same issue as C1, called out separately because it is the foot-gun in storage that loses you private board files even if the table-level RLS leak is fixed.

---

## D. High-risk issues

D1. **Default `gallery_images.status = 'published'`.** `001_initial_schema.sql:153`. Combined with C1, any authenticated user could insert directly-published images. Admin upload UI also forces `status: 'published'` (no review queue).

D2. **No moderation queue for gallery; `AdminGalleryPage` calls `supabase.storage.from('gallery').upload(...)` with no MIME/size check, no virus check, no image dimension cap, and does not delete the storage object when an image record is deleted (orphan files in public bucket).**

D3. **All public submission tables (`events`, `announcements`, `businesses`, `fundraisers`) accept anon inserts with `with check (status = 'pending')`. No CAPTCHA, no rate limiting, no honeypot, no email verification.** This is a wide-open spam intake. `community_groups`, `service_interests`, `contact_submissions` and the `submit_membership_registration` RPC have the same exposure.

D4. **`admin_users` is a VIEW, not a table.** `010_admin_user_security.sql:88-101` recreates `admin_users` as a join across `auth.users`, `profiles`, `admin_user_profiles`. The codebase only `select`s from it (correct), but any future code that tries to `update admin_users set role=...` will fail. This is not a current bug but is a correctness landmine.

D5. **Two parallel "household" models.** `household_members` (linked to `members` rows from anon membership form) and `profile_household_members` (linked to `auth.users` from authenticated profile page). They are not reconciled. Same data lives in two places with two RLS shapes.

D6. **No audit log table.** `src/lib/database.types.ts:347` mentions `admin_activity_log`, but no migration creates it (the comment in `supabase.ts` admits the local types file is out of sync with migrations). There is no record of who approved what, who deleted what, or when admin roles changed.

D7. **No password policy / MFA on member auth.** Admin password-rotation gate exists (`adminPasswordGate`, `admin_user_profiles.must_change_password`), but member accounts have no rotation, no MFA, no session timeout config visible.

D8. **`admin_user_profiles` insert/update RLS uses `is_admin()` (= any authed user)** at `010_admin_user_security.sql:75, 80-82`. Any authenticated user can flip the `must_change_password` flag and metadata for any admin row. Combined with C1 this is a privilege-escalation lever.

D9. **Vercel deployment artifacts (`.vercel/`) are present in the working tree.** Confirm Vercel project IDs are not staging/prod-mixed.

D10. **`database.types.ts` is hand-rolled and stale.** Its own header says so. TypeScript types do not enforce DB shape; runtime shape mismatches like C3 are not caught at compile time.

---

## E. Medium-risk issues

E1. Public submission forms (`SubmitEventPage`, `SubmitBusinessPage`, etc.) insert directly into the target tables instead of into a unified `public_submissions` queue. The admin "Submissions" page reads `status='pending'` per type. It works, but creates four spam surface tables instead of one.

E2. `contact_submissions.type` is a domain enum (`general | event_submission | business_inquiry | fundraiser | other`) but the public form lets the user pick from a free-text list (`General Inquiry`, `Event Submission`, etc.). Mapping is ad-hoc.

E3. `gallery_images` and `gallery_albums` lack a moderation status flow on the public side (only admin upload). This is acceptable today but blocks any "members upload to public gallery" feature.

E4. `events`, `announcements`, `businesses`, `fundraisers`, `sports_posts` use `content_status` enum (`draft | pending | published | unpublished | archived | rejected | cancelled`). `resources` uses its own `status text` (`draft | published | archived`) and a separate `access_level`. `community_groups` uses yet another `status` enum (`pending | approved | published | rejected | archived`). Three nomenclatures; not catastrophic, but every admin page handles them slightly differently.

E5. `BusinessTier` enum in DB is `basic | verified | featured | sponsor`; `src/lib/types.ts` declares `'free' | 'verified' | 'featured' | 'sponsor'`. Same pattern (`free` vs `basic`) inconsistency.

E6. Resources `file_url` column stores raw `/kigh-documents/...` paths (served from `public/kigh-documents/`). These ship in the SPA build and are public regardless of `access_level`. Anything seeded as `public` in 004 is fine; anything later marked `members_only` or `admin_only` but still pointing at `/kigh-documents/...` would still be downloadable to the public.

E7. No structured logging or error reporting (Sentry, Logflare, etc.) is configured.

E8. No CI workflow committed (`.github/workflows/` is absent). Migrations and lint are not gated.

E9. Storage policies grant `auth.uid() is not null` insert on the public buckets (`gallery`, `event-flyers`, `business-logos`, `fundraiser-images`). Any authed user can upload arbitrary files into those public buckets.

---

## F. Low-risk polish items

F1. README §6 still tells admins to use the Auth API directly with the anon key for first admin — replace with the Edge Function path.
F2. `kigh-private-review/` exists locally; ensure it never enters CI artifacts or backups even though it's gitignored.
F3. `dist/`, `playwright-report/`, `test-results/` are present in the working tree but gitignored — fine, just confirm no PR ever attaches them.
F4. `events` table missing `(start_date, status) WHERE status='published'` partial index for the calendar query.
F5. `businesses.zip` text without check; `businesses.state` defaults `'TX'` but no check constraint.
F6. `members.email` does not have a unique constraint — duplicate applications won't be deduplicated automatically.

---

## G. Table-by-table database audit

For each table: purpose / public sensitivity / required columns / approval flow / RLS / verdict.

| Table | Purpose | Sensitivity | Status field | Anon insert? | RLS read | RLS admin | Verdict |
|---|---|---|---|---|---|---|---|
| `events` | Event listings (calendar) | Public | `status` (content_status) | yes (with check status='pending') | published only | `is_admin()` BROKEN | Schema OK; RLS broken (C1). Index on `(status, start_date)` would help. |
| `announcements` | News & updates | Public | `status` | yes | published only | `is_admin()` BROKEN | Schema OK; RLS broken (C1). |
| `businesses` | Directory | Public (profile) | `status`, `tier` | yes | published only | `is_admin()` BROKEN | Schema OK; RLS broken (C1); tier name mismatch with TS (E5). |
| `fundraisers` | Community fundraisers | Public + verification | `status`, `verification_status` | yes | published only | `is_admin()` BROKEN | Schema OK; RLS broken (C1). |
| `sports_posts` | Sports/youth | Public | `status` | NO insert policy exists for anon | published only | `is_admin()` BROKEN | Anon submit pathway not wired. |
| `gallery_albums` | Album metadata | Public | none | none | public read all | `is_admin()` BROKEN | OK shape; RLS broken (C1). |
| `gallery_images` | Image rows | Public | `status` defaulting to **`published`** | none | published only | `is_admin()` BROKEN | Default-published is risky (D1); admin uploads bypass review. |
| `contact_submissions` | Contact / Join inbox | **PRIVATE** | `is_read` (not `status`) | yes (anon insert true) | admin only | `is_admin()` BROKEN | C3 schema/code drift; PII; RLS broken (C1). |
| `members` | Membership applications | **PRIVATE** | `membership_status`, `dues_status` | via SECURITY DEFINER RPC | admin only | `is_admin()` BROKEN | C5 not linked to auth users; RLS broken (C1); no good-standing flag (C6). |
| `household_members` | Family on a `members` row | **PRIVATE** | none | via RPC | admin only | `is_admin()` BROKEN | OK shape; RLS broken (C1). |
| `membership_payments` | Dues records | **PRIVATE** | `payment_status` | none | admin only | `is_admin()` BROKEN | OK shape; never written by app code; RLS broken (C1). |
| `resources` | Resource library | Mixed (public/members/admin) | `status` + `access_level` | none | public+published+access=public only | `is_admin()` BROKEN | Best-modeled table; RLS broken (C1); private storage bucket also broken (C2). |
| `community_groups` | Non-commercial directory | Public via RPC | `status` (own enum) | yes | none direct (RPC only) | `is_admin()` (C1) | Best-implemented public-list pattern; admin RLS still broken (C1). |
| `service_interests` | Volunteer/leadership leads | **PRIVATE** | `status` (own enum) | yes (with check true) | admin only | `is_admin()` BROKEN | OK shape; RLS broken (C1). |
| `profiles` | Auth-linked user profile + member fields | Member-private | none | own row | own or `is_admin()` | `is_admin()` BROKEN | Mixed concern (admin metadata + member fields); RLS broken (C1). |
| `admin_user_profiles` | Password rotation + board pseudo-account flags | Admin-only | `must_change_password` | none | own or `is_admin()` | `is_admin()` BROKEN | D8 anyone-authed can write. |
| `profile_household_members` | Auth-user household | Member-private | none | own | own or `kigh_is_elevated_admin()` | `kigh_is_elevated_admin()` GOOD | Correctly modeled. |
| `member_media_submissions` | Member-uploaded media pending review | Member-private | `status` (own enum) | own (status pending) | own or elevated admin | `kigh_is_elevated_admin()` GOOD | Correctly modeled. |

Views: `admin_users` (D4 — view, never insert into it).
Functions: `set_updated_at()`, `is_admin()` (BROKEN), `kigh_is_elevated_admin()` (good), `submit_membership_registration(jsonb)` (security definer, anon-callable, validates input), `list_public_community_groups(text,text)` (security definer, public-safe).

Missing tables that the spec calls for: `audit_logs` / `admin_activity_log`, `agm_meetings`, `agm_quorum_snapshot`. None exist.

---

## H. RLS & security audit

Helper functions:
- `is_admin()` — **BROKEN.** Returns `auth.uid() IS NOT NULL`. Treats every authenticated user as an admin.
- `kigh_is_elevated_admin()` — **CORRECT.** Verifies `profiles.role` is in the admin role set.

Policies that depend on the broken helper (and therefore are broken):
- `events`, `announcements`, `businesses`, `fundraisers`, `sports_posts`, `gallery_albums`, `gallery_images`, `contact_submissions` (admin policies)
- `members`, `household_members`, `membership_payments`, `resources` (admin policies)
- `community_groups` (admin policies)
- `service_interests` (admin select/update)
- `profiles` (read/update fallback to `is_admin()`)
- `admin_user_profiles` (read/insert/update fallback)
- Storage on `kigh-private-documents` bucket (all four CRUD policies)
- Storage on `gallery`, `event-flyers`, `business-logos`, `fundraiser-images` (insert policies — `auth.uid() is not null` is functionally identical)

Policies that are correct:
- Public read filters (`status='published'`) on the public-facing tables.
- Anon insert with `with check (status='pending')` is the right shape for moderation, modulo D3 (no rate limiting).
- `kigh-member-media` and `kigh-gallery-submissions` storage policies — first path segment must equal `auth.uid()` and admin override uses `kigh_is_elevated_admin()`. Correct, well-modeled.
- `submit_membership_registration` RPC — security definer, validates required fields and consent, uses parameterized inserts.
- `list_public_community_groups` RPC — security definer, scrubs submitter PII and notes from public output.
- `profiles` insert restricted to `id = auth.uid()` (own row) is correct; admin-insert variant via `is_admin()` is broken-but-redundant.

Permissive policies using `true`:
- `contact_submissions` insert (`with check (true)`) — intentional for contact form.
- `service_interests` insert (`with check (true)`) — intentional.
- `gallery_albums` select (`using (true)`) — public catalog, fine.

Missing RLS / no RLS detected: every table has `enable row level security`. Good. The problem is policy correctness, not policy presence.

Bottom line on security: **the database trusts authentication as authorization on virtually every privileged path. This is the single most important blocker.**

---

## I. Storage / media audit

Buckets created by migrations:
- `gallery` (public) — uploaded by any authed user; public read; orphan files on row delete (D2).
- `event-flyers` (public) — same shape as `gallery`.
- `business-logos` (public) — same shape.
- `fundraiser-images` (public) — same shape.
- `kigh-private-documents` (private, 50 MB cap) — read/write gated by `is_admin()` → C2 leak.
- `kigh-member-media` (private, 50 MB cap) — owner-or-elevated-admin, path-prefixed by `auth.uid()`. Correct.
- `kigh-gallery-submissions` (private, 50 MB cap) — same correct shape.

Frontend usage:
- `src/pages/admin/GalleryPage.tsx` uploads to `gallery` and immediately marks the row `status='published'`. No mime/size check.
- `src/pages/admin/AdminResourcesPage.tsx` uploads private files to `kigh-private-documents`, generates short-lived signed URLs (good), and removes objects on row delete (good).
- `src/pages/member/ProfilePage.tsx` and `ProfileMediaPage.tsx` use the private member buckets correctly with signed URLs.
- The four other public buckets (`event-flyers`, `business-logos`, `fundraiser-images`) appear to have **no upload code in `src/`** — submission forms accept text/URLs only. So those buckets currently exist but are dormant. Either wire admin uploads or drop them in production.

Recommended bucket model for clean prod:
- `public-gallery` (public; only approved images; uploads gated to an explicit moderation flow).
- `public-event-images` (public).
- `public-business-logos` (public).
- `public-fundraiser-images` (public).
- `private-member-media` (private, owner-folder-scoped, elevated-admin override).
- `private-member-gallery-submissions` (same shape).
- `private-admin-documents` (private, elevated-admin only — this replaces `kigh-private-documents`).
- All policies use the correct elevated-admin check, never `is_admin()`.

---

## J. Auth / admin audit

What works:
- App-level `ProtectedRoute` checks `isAdmin = profile.role ∈ ADMIN_ROLES` against `profiles.role`. This is the correct check **on the client** but is bypassable; it is the DB that enforces real boundaries.
- `AuthContext` correctly fetches `profiles` and `admin_user_profiles` and exposes a password-rotation gate (`adminPasswordGate`).
- `AdminLayout` redirects to `/admin/change-password` when `must_change_password` is set. Reasonable rotation UX.
- Edge Function `create-admin-user` uses the service-role key server-side, validates the caller's role from `profiles`, only allows `super_admin` / `community_admin` to create users, and forces `must_change_password=true`. Good shape.
- Edge Function `delete-admin-user` only allows `super_admin`. Good shape.
- Admin password policy helpers (`adminPasswordPolicy`, `adminPasswordGate`) implement a 180-day rotation horizon.

What does NOT work:
- DB-level role check (`is_admin()`) ignores `profiles.role` entirely. Client-side gate only.
- `admin_users` is a view; UsersPage correctly only `select`s from it.
- No record of admin actions (no audit log).
- No 2FA on admin accounts.
- Admin role separation defined in TypeScript (`super_admin`, `community_admin`, `business_admin`, `support_admin`, `moderator`, `viewer`) is **not enforced by RLS at all** — RLS treats them all the same as "authenticated."

Recommended target role model (per spec, mapped to current names):
| Spec role | Current role | Powers |
|---|---|---|
| `super_admin` | `super_admin` | Everything; only role allowed to create/delete admin users; only role allowed to change another user's role. |
| `admin` | `community_admin` | All content tables, members, contact, resources. |
| `content_manager` | `moderator` | Events, announcements, resources, sports posts. |
| `membership_manager` | (new) | `members`, `household_members`, `membership_payments` only. |
| `treasurer` | (new) | `membership_payments`, fundraiser verification, `kigh-private-documents` (financial). |
| `media_moderator` | (new or `moderator`) | Gallery, member media submissions, profile media. |

Today's roles `business_admin`, `support_admin`, `viewer` are declared but unused at the RLS layer.

---

## K. Workflow audit

Mapped from `App.tsx` + page implementations.

**Visitor browses homepage** — works. Pulls counts/latest content. Risk: counts rely on RLS published filters which work.
**Visitor views events / event detail** — works (`status='published'` filter).
**Visitor views announcements / detail** — works.
**Visitor views businesses / detail** — works.
**Visitor views fundraisers / detail** — works.
**Visitor views gallery** — works.
**Visitor views sports/youth + detail** — works (no anon insert path).
**Visitor views resources** — works for `public` resources; private docs hidden.
**Visitor views community groups** — works via `list_public_community_groups` RPC.
**Visitor submits contact form** — **likely broken (C3).** Code inserts unknown columns; the row will either be rejected or silently lose `phone` and `inquiry_type`.
**Visitor submits event/announcement/business/fundraiser** — works to insert; spam exposure (D3).
**Visitor submits community group** — works.
**Visitor submits service interest** — works.
**Visitor submits membership/family registration** — works via RPC; **disconnected from auth (C5)**; no payment integration.
**Member logs in (`/login`)** — works if a Supabase user exists; no self-signup flow visible.
**Member edits profile + household + uploads avatar/media** — works; private buckets correct.
**Member submits gallery media for review** — works; `kigh_is_elevated_admin` gates approval correctly.
**Admin logs in** — works; password rotation gate works.
**Admin dashboard** — works.
**Admin manages calendar/announcements/businesses/fundraisers/sports/gallery/resources/community groups/members/service interests/media submissions/contacts/users/settings** — works UI-side; **all DB writes succeed for any authenticated user, not just admins (C1)**.
**Admin moderates submissions** — works (status flip to `published`).
**Admin approves member media submission** — works (correct RLS).
**Admin force-rotates admin passwords** — works via `admin_user_profiles.must_change_password`.
**Logout** — works.
**Protected route behavior** — client side OK; **server side (RLS) does not match the client gate**.
**Public users cannot read private submissions** — true today only because anon has no SELECT policy on those tables. **The moment any user signs in, they can read everything (C1).**

Missing or fragile workflows:
- No "approved" intermediate state for events/announcements/businesses/fundraisers — they go directly from `pending → published`.
- No notification on submission (no email out to admins, no email confirmation to submitter).
- No member self-service for membership applications (C5).
- No AGM scheduler / quorum tracker (C6).
- No site-wide search.
- No admin bulk actions, no soft-delete trash bin.
- Gallery delete leaves orphan storage objects (D2).

---

## L. Membership / family registration gap analysis

What exists:
- `members` (anon-submitted, RPC-validated, RLS admin-only).
- `household_members` (linked to `members.id`).
- `membership_payments` (table only; never written by app).
- `members.membership_status` and `members.dues_status` enums.
- `members.willing_to_volunteer`, `willing_to_serve` booleans (from migration 012).
- Admin members page (CSV export, status/dues editing, household toggle, detail dialog).

What is missing:
- No `auth.uid()` link on `members` rows. A member who applied via the public form cannot log in to view or edit their own application or household. C5.
- No `good_standing` boolean or computed view. C6.
- No AGM table, no quorum-snapshot view, no membership-as-of-date helper. C6.
- No payment integration (Stripe, Zelle reference, etc.). The `membership_payments` table is dormant.
- No email confirmation to applicant after `submit_membership_registration` succeeds.
- No duplicate-email guard on `members` (E?).
- No way for an admin to convert a `members` row into an authenticatable account (i.e. send an invite + create profile). The Admin Users page can create admins but not member auth users.
- Two-track household model (D5) makes it impossible to "promote" a member-form household to a profile household without a manual data migration.
- AGM quorum copy on the Governance page is currently aspirational — there is no DB to back it.

Bottom line: as-is the site supports **applying** for membership but not **being** a member. To go to production credibly you need (a) a `members.user_id` column with an admin-driven invite flow, (b) a `good_standing_as_of` date or boolean, (c) AGM scheduling + quorum snapshot tables, (d) member self-service against `members` (not `profiles`).

---

## M. Recommended staging / production architecture

Current → Staging → Production layout:

- **GitHub branches**
  - `main` → production
  - `staging` → staging/UAT
  - `feature/*` → development; PR into `staging`; merge `staging` → `main` only via approved release PR with migration review.
  - Branch protection on `main` and `staging`: require PR review, require status checks (lint + typecheck + e2e smoke).

- **Vercel projects**
  - `kch-production` (production project) — Production = `main`, Preview = `staging` and feature branches.
  - `kch-staging` is **the same Vercel project** but with environment-specific env vars per branch — OR — a separate Vercel project pointed at the staging Supabase. Pick one and document. Recommended: separate Vercel projects so URL, OG tags, and analytics are split.
  - Add a top-of-page staging banner that renders when `VITE_APP_ENV !== 'production'`.

- **Supabase projects**
  - **Existing project = `kch-staging`.** Rename to make it obvious in the dashboard.
  - **New project = `kch-production`.** Apply migrations only. Do **not** apply `seed.sql`.
  - Disable email signup in production Supabase Auth settings (admins-only invite flow via Edge Function). Confirm this in staging too if member self-signup isn't intended.
  - Service-role key only ever in Edge Functions and CI secrets — never in `.env`.
  - Separate buckets per project — never share storage URLs across environments.

- **Environment variables**
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_APP_NAME`, `VITE_APP_ENV` (`production` | `staging` | `development`), `VITE_CONTACT_EMAIL`.
  - Add `.env.production.example` and `.env.staging.example` checked into the repo (no secrets, only variable names + hint comments).
  - In CI/Vercel: set per-environment values; never copy production keys into staging or vice versa.
  - Add a runtime guard in `src/lib/supabase.ts`:
    - If `VITE_APP_ENV === 'production'` and `VITE_SUPABASE_URL` does not match an allow-listed prod ref, throw at boot.

- **Migration sequence for production project**
  1. `001_initial_schema.sql`
  2. `002_rls_policies.sql` — **fix `is_admin()` first** (see plan below).
  3. `003_storage.sql` — fix bucket policies to use `kigh_is_elevated_admin()`.
  4. `004_kigh_hub.sql` — same RLS fix.
  5. `005`, `006`, `007` — these only seed event rows. **Skip in production** unless those events are actually KIGH events that should appear from day 1.
  6. `008_kigh_private_documents.sql` — **rewrite to use `kigh_is_elevated_admin()`**.
  7. `009_kigh_community_groups.sql` — same RLS fix.
  8. `010_admin_user_security.sql` — same RLS fix; replace `is_admin()` calls.
  9. `011_kigh_service_interest.sql` — same.
  10. `012_member_profiles_and_media.sql` — already correct.
  11. New migration `013_replace_is_admin_with_elevated_admin.sql` — drop legacy `is_admin()` (or repoint it to call `kigh_is_elevated_admin()`), drop and recreate every legacy "admins full access" policy. Apply on staging first.
  12. New migration `014_audit_logs.sql` — create `audit_logs` table + triggers on critical tables.
  13. New migration `015_member_user_link_and_good_standing.sql` — add `members.user_id`, `members.good_standing`, `members.good_standing_as_of`.
  14. New migration `016_agm_and_quorum.sql` — `agm_meetings`, `agm_quorum_snapshots`, helper view `members_in_good_standing`.
  15. Optional: new migration `017_drop_dormant_buckets.sql` if the four public buckets stay unused — but only after confirming admin upload pages don't need them.

- **Seed-data strategy**
  - Production: **no `seed.sql`.** Hand-craft a tiny bootstrap migration (`seed_production.sql`, not auto-run) that inserts only verified, real KIGH content (constitution links, real upcoming events, real community groups). Run it once, manually, after a senior board member sign-off.
  - Staging: keep using current `seed.sql` for development and testing.

---

## N. Step-by-step safe duplication plan

Phase 0 — Lock down current
- Tag the current commit on `main` as `pre-staging-cutover` so we have a rollback point.
- Snapshot current Supabase project (Database backup + storage objects export).
- Confirm Vercel project that points at the current Supabase. Note its env values privately (do not commit).

Phase 1 — Re-label current as STAGING (no destructive changes yet)
- In Supabase dashboard: rename project to `kch-staging`.
- In Vercel: rename project (or create alias) to make it obvious it is staging; restrict its custom domain to `staging.kenyancommunityhouston.org` (or similar).
- In repo:
  - Add `staging` branch from current `main`.
  - Add `.env.staging.example`.
  - Add `VITE_APP_ENV` plumbing in `src/lib/supabase.ts` and a `<StagingBanner />` shown when not production.
  - Add prod-DB guard in `src/lib/supabase.ts` (allow-listed ref).
  - Open a PR titled `chore(env): introduce APP_ENV + staging banner`. Merge into `staging`, validate.

Phase 2 — Fix blockers in staging first
- New migration `013_replace_is_admin_with_elevated_admin.sql`.
- New migration `014_audit_logs.sql`.
- New migration `015_member_user_link_and_good_standing.sql`.
- New migration `016_agm_and_quorum.sql`.
- Fix C3 (contact_submissions): either update DB to add `phone`, `inquiry_type`, `status` columns, or update form to insert exactly the schema columns; pick one and align both.
- Fix D2 (gallery default + storage cleanup).
- Decide on D3 spam mitigations (CAPTCHA, rate limit Edge Function, or Cloudflare Turnstile) — at minimum add per-IP rate limit on submission endpoints.
- Run full e2e suite against staging with `E2E_ENABLE_FORM_SUBMISSIONS=true` and `E2E_ENABLE_UPLOAD_TESTS=true`.
- Manual SQL RLS tests as anon, as authenticated-non-admin, as `community_admin`, as `super_admin` — assert each table and bucket behaves correctly.

Phase 3 — Stand up clean PRODUCTION Supabase
- Create new Supabase project `kch-production` in the same region.
- Apply migrations 001 → 012 + the new 013 → 016 (skip 005/006/007 unless desired).
- Manually create the first `super_admin` via the SQL editor: insert into `auth.users` (or create via dashboard), then insert into `profiles` and `admin_user_profiles` with `role='super_admin'` and `must_change_password=true`. Share the temp password securely (out of band).
- Disable email signup on production Auth settings.
- Configure Storage size limits, allowed mime types, and CORS to match staging.
- Configure Auth → Email templates for production domain.
- Configure SMTP if/when needed.

Phase 4 — Stand up clean PRODUCTION Vercel deployment
- New Vercel project `kch-production` linked to `main` only.
- Env vars: `VITE_APP_ENV=production`, `VITE_SUPABASE_URL=<prod>`, `VITE_SUPABASE_ANON_KEY=<prod-anon>`, `VITE_APP_URL=https://kenyancommunityhouston.org`, …
- Domain: attach the apex/canonical domain to `kch-production`. Move staging onto its own subdomain.

Phase 5 — Curated content port (no bulk copy)
- Identify approved public content from staging that should appear on production day-1: published events, published announcements, published businesses, published fundraisers, published community groups, governance resources.
- For each, export to JSON / CSV and re-insert via a one-off `seed_production.sql` or via the admin UI as a real admin user. Do **not** copy `members`, `contact_submissions`, `service_interests`, `profiles`, or any storage object that wasn't independently audited.
- Reset slugs, IDs, timestamps so production rows are not pretending to be the same rows as staging.

Phase 6 — Cutover
- Freeze writes on staging during the cutover window (announce internally).
- DNS swap to production Vercel project.
- Smoke test against production using the launch gates in section O.
- Re-open staging for ongoing UAT.

Phase 7 — Post-cutover
- Add CI workflow (`.github/workflows/ci.yml`) that runs lint + typecheck + Playwright smoke against `main` PRs.
- Add a scheduled job (cron) to validate RLS by calling a Postgres function that asserts policy presence; alert on drift.
- Add a public status / changelog page.

---

## O. Cutover checklist (production go / no-go)

Public surface:
- [ ] Homepage loads, mobile layout works.
- [ ] Events page lists only `published` and respects timezone.
- [ ] Calendar page loads, event detail loads.
- [ ] Announcements page + detail.
- [ ] Businesses directory + detail.
- [ ] Community support (fundraisers) page + detail.
- [ ] Sports / youth page + detail.
- [ ] Gallery loads only `published` images.
- [ ] Resources page shows only `public` + `published`.
- [ ] Community groups page lists from `list_public_community_groups` only.
- [ ] New to Houston, About, Governance, Privacy, Terms, Disclaimer all render.
- [ ] Contact form submits and admin can read it (after C3 is fixed and verified end-to-end).
- [ ] Membership form submits via RPC; success page shown; private to admins.
- [ ] Service interest form submits; private to admins.
- [ ] Submit-event/announcement/business/fundraiser forms create `pending` rows; not visible publicly until admin approves.

Admin surface:
- [ ] `/admin/login` works; non-admin auth users are rejected (verify by signing in with a regular `profiles.role='community_admin'`-less user — they should be redirected and unable to read private tables).
- [ ] Force-rotate admin password flow works.
- [ ] Admin dashboard, calendar, announcements, businesses, fundraisers, gallery, members, community groups, service interests, media submissions, contacts, resources, users, settings all load.
- [ ] Approval flow flips status from `pending → published`.
- [ ] Reject flow flips to `rejected`.
- [ ] `super_admin` can create another admin via Edge Function; non-super cannot delete.

Security:
- [ ] Anon: cannot read `contact_submissions`, `members`, `household_members`, `membership_payments`, `service_interests`, `profiles`, `admin_user_profiles`, `member_media_submissions`, `profile_household_members`, `community_groups` (raw table), `kigh-private-documents` storage, `kigh-member-media`, `kigh-gallery-submissions`.
- [ ] Authenticated non-admin (a member with `profiles.role` outside the admin set): cannot read or write any of the above except their own `profiles`, their own `profile_household_members`, their own `member_media_submissions`, and own-folder objects in `kigh-member-media` / `kigh-gallery-submissions`.
- [ ] `community_admin`: full CRUD on content tables and members/contacts; cannot create or delete admin users.
- [ ] `super_admin`: full CRUD everywhere including admin users.
- [ ] Storage: signed URLs for private buckets work and expire; public buckets serve only approved content.
- [ ] Production env vars point at production Supabase only; staging env vars at staging only; runtime guard refuses mismatch.
- [ ] No `seed.sql` data is present in production.

Operations:
- [ ] DB backups enabled with PITR (or daily snapshots minimum).
- [ ] Storage object lifecycle policies configured.
- [ ] Edge Functions deployed (`create-admin-user`, `delete-admin-user`) with `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Monitoring / error reporting wired (recommended Sentry).
- [ ] Domain HTTPS, HSTS, security headers verified.

Governance:
- [ ] AGM month confirmed November in code AND in DB (e.g. `app_settings.agm_month=11`).
- [ ] AGM quorum 25% verified by `members_in_good_standing` view + a quorum-snapshot test.

If any box is unchecked, do not flip DNS.

---

## P. Rollback plan

- Keep DNS TTL low (300s) during cutover.
- If the production Vercel deployment misbehaves: revert Vercel deployment to previous (none yet — fall back to staging behind the canonical domain only as an emergency, with the staging banner ON).
- If a production migration breaks RLS: revert by running the previous migration's inverse (each new migration must come with a documented rollback SQL block in `docs/rollbacks/<id>.sql`).
- If production data is accidentally written by tests or by a bad release: restore from the most recent backup; re-run `seed_production.sql` if needed.
- Always retain at least 14 days of backups before any cutover activity.

Trigger criteria for rollback (any one is enough):
- RLS check anywhere returns "any authenticated user can read private table X."
- An admin action raised an unexpected error and there is no audit trail to reconstruct it.
- Any public page exposes content from `kigh-private-documents`, `members`, `contact_submissions`, or `service_interests`.
- Email or domain configuration is wrong and outbound mail is failing.

---

## Q. Exact questions to answer before final production

1. Is Supabase Auth email signup enabled today? If yes, that combined with C1 is a privilege escalation path; please disable in production at minimum.
2. Who today has rows in `auth.users` and what does each one's `profiles.role` say? (Confirm no surprise admins.)
3. Is the contents of `kigh-private-documents` real and sensitive? If yes, treat C2 as a current incident, not a future risk.
4. Are the four dormant public buckets (`event-flyers`, `business-logos`, `fundraiser-images`, partly `gallery`) intended to be admin-managed, member-uploadable, or removed?
5. Is membership intended to be self-service (member logs in to view application, household, dues) or admin-only? This decides whether C5 is a launch-blocker.
6. Is dues collection in scope for v1? If yes, choose a payment provider and schema before cutover; if no, document it.
7. Should AGM scheduling and quorum reporting ship at v1, or is the November AGM copy aspirational? If shipping, migrations 016+ must land before cutover.
8. What's the desired role split — does the 6-role spec (super_admin, admin, content_manager, membership_manager, treasurer, media_moderator) supersede the current 6-role list? They overlap but not exactly.
9. CAPTCHA / spam control: which provider (Turnstile, hCaptcha, none + rate limit only)?
10. Email transactional provider for confirmations (Postmark, Resend, SES)?
11. Are the seeded "real" KIGH governance documents in `public/kigh-documents/` actually cleared for public hosting? They ship in the SPA build and are addressable by anyone.
12. Confirm rotation policy on the production anon key and service-role key (who has it, where stored, when last rotated).
13. Domain plan: will production live on the apex (`kenyancommunityhouston.org`) and staging on a subdomain? Confirm so we can configure Auth callback URLs correctly.
14. Backup strategy: is Supabase PITR enabled? Off-site backup destination?
15. Acceptance owner for cutover: who signs off the launch checklist (section O)?

---

## Files inspected

Top level: `package.json`, `vite.config.ts`, `playwright.config.ts`, `.env.example`, `.env.test.example`, `.env` (redacted), `.gitignore`, `README.md`.
SQL: `supabase/migrations/001..012`, `supabase/seed.sql`, `supabase/functions/create-admin-user/index.ts`, `supabase/functions/delete-admin-user/index.ts`.
Frontend core: `src/App.tsx`, `src/lib/supabase.ts`, `src/lib/types.ts`, `src/contexts/AuthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/RequireAuth.tsx`, `src/components/layout/AdminLayout.tsx`.
Admin pages: `LoginPage.tsx`, `UsersPage.tsx`, `DashboardPage.tsx`, `GalleryPage.tsx`, `SubmissionsPage.tsx`, `ContactsPage.tsx`, `AdminMembersPage.tsx`, `FundraisersPage.tsx`, plus references to the rest.
Public pages: `MembershipPage.tsx`, `ContactPage.tsx`, all `Submit*Page.tsx`, `GovernancePage.tsx`.
Member pages: `MemberLoginPage.tsx`, `ProfilePage.tsx`, `ProfileMediaPage.tsx`.
Tests: `e2e/tests/admin-auth.spec.ts`, `public-forms.spec.ts`, `private-resources.spec.ts`, `console-errors.spec.ts`, plus filename inventory of remaining specs.

## Files NOT inspected (deliberate — out of scope or risky)

- The actual contents of `kigh-private-review/` (sensitive, gitignored — confirmed not tracked).
- Live data in the Supabase DB (no destructive read; relied on schema only).
- Vercel project settings, DNS, and SMTP.
- The contents of `public/kigh-documents/` beyond confirming the path scheme.

---

## Update — May 2026 hardening run (post-audit)

The hardening pass landed migrations 013 → 019, frontend env
separation, contact-form schema alignment, the multi-community /
ads foundation, audit logs, member auth-link / good-standing /
quorum, the StagingBanner, the Supabase URL allow-list guard, and
the production seed split. The detailed change log is in
`docs/security-hardening-run.md`. Status of the original blockers:

- **C1 fixed** (013) — `is_admin()` now delegates to
  `kigh_is_elevated_admin()`.
- **C2 fixed** (013 + 019) — `kigh-private-documents` storage uses
  the elevated helper.
- **C3 fixed** (018 + ContactPage / AdminContactsPage updates).
- **C4 mitigated** — `seed.sql` clearly marked local-only,
  `seed.production.example.sql` shipped, README warns.
- **C5 partially fixed** — `members.user_id`, member self-RLS, and
  `kigh_link_member_to_user` are in place. Member self-service UI
  is the next step but no longer a security blocker.
- **C6 fixed** — `community_governance_settings`, `members.good_standing`,
  `members_in_good_standing` view, `kigh_agm_quorum_required` RPC.
- **C7 fixed** — `VITE_APP_ENV`, banner, allow-list guard,
  `.env.staging.example`, `.env.production.example`.
- **C8 fixed** — storage admin policies use elevated helper.
- **D1 fixed** — `gallery_images.status` defaults to `pending`.
- **D3 partially mitigated** — honeypot on contact form; CAPTCHA
  still recommended pre-launch.
- **D6 foundation in place** — `audit_logs` + `kigh_record_audit`
  RPC; trigger-based auto-audit deferred.
- **D8 fixed** transitively via 013.

Verdict change: the previous "NOT READY to duplicate as-is" stands
**only** for the production project (which has not yet been
created). Staging itself has had every code-side and migration-side
blocker repaired. After the manual SQL validation in
`docs/staging-rls-security-fix-validation.md` passes against the
staging Supabase project, the platform is **READY to create the
clean production Supabase project** following
`docs/production-cutover-checklist.md`.
