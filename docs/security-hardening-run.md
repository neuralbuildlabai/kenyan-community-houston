# Security Hardening Run — May 2026

Project: Kenyan Community Houston (KIGH)
Run date: 2026-05-04
Run owner: production-readiness sweep before duplication
Scope: code, migrations, env separation, docs. **No remote DB writes**, no `.env` secret edits, no production project created.

This document records every change made in the hardening pass and what each one is intended to fix. Cross-reference `docs/staging-production-duplication-brutal-assessment.md` for the original blocker list (C1–C8, D1–D10, E1–E9, F1–F6).

---

## 1. New migrations

| File | Purpose |
|---|---|
| `supabase/migrations/013_security_is_admin_repair.sql` | **Critical fix.** Replaces `public.is_admin()` so it now returns true only for elevated `profiles.role`. Adds the helper trio `kigh_current_user_role`, `kigh_is_platform_super_admin`, `kigh_has_community_role`. Extends `kigh_is_elevated_admin()` to recognise the new role spec (`admin`, `content_manager`, `membership_manager`, `treasurer`, `media_moderator`, `ads_manager`) plus the legacy roles for backward compatibility. |
| `supabase/migrations/014_multi_community_foundation.sql` | Adds `communities`, `community_domains`, `community_admin_roles`, `community_governance_settings`. Seeds the default KIGH community (slug `kigh`) and AGM=November / quorum=25%. Adds nullable `community_id` to all tenant-scopable public/admin tables, defaults to KIGH, backfills existing rows, indexes the new column. |
| `supabase/migrations/015_audit_logs.sql` | New `audit_logs` table + `kigh_record_audit()` SECURITY DEFINER writer. RLS reads scoped to elevated admins / community scope. Inserts blocked from clients (must go through the writer). |
| `supabase/migrations/016_member_auth_link_and_governance.sql` | Adds `members.user_id`, `good_standing`, `good_standing_as_of`, `membership_started_at`, `membership_expires_at`, `reviewed_by/at/notes`. Adds optional `household_members.user_id`. Self-RLS for the linked auth user. View `members_in_good_standing` and helper `kigh_agm_quorum_required(community_id)`. Admin RPC `kigh_link_member_to_user`. Unique email index on `members`. |
| `supabase/migrations/017_community_ads.sql` | New `community_ads` table with placements, status workflow, date window, priority. RLS: public sees only `approved` + in-window. Insert/update/delete gated by `kigh_has_community_role(['super_admin','community_admin','admin','ads_manager'], community_id)`. Helper RPC `list_active_community_ads(placement, community_id, limit)`. |
| `supabase/migrations/018_contact_submissions_schema_align.sql` | **Schema/code drift fix.** Adds `phone`, `inquiry_type`, `status`, `admin_notes`, `honeypot`, `submitter_ip`, `user_agent`, `updated_at`. Backfills new fields from legacy `is_read`/`type`. Adds DB trigger to keep `is_read` in sync with `status`. Tightens public insert policy (length checks + honeypot empty). Re-asserts admin-only SELECT/UPDATE via `kigh_is_elevated_admin()`. |
| `supabase/migrations/019_gallery_and_storage_hardening.sql` | Default `gallery_images.status` is now `pending` (admin uploads still pass `published` explicitly). Storage policies on `gallery`, `event-flyers`, `business-logos`, `fundraiser-images` now require `kigh_is_elevated_admin()` instead of any signed-in user. `kigh-private-documents` policies recreated against the canonical helper. |

All migrations are additive and idempotent — safe to re-run on staging.

---

## 2. Frontend changes

| File | Purpose |
|---|---|
| `src/lib/appEnv.ts` | New module: parses `VITE_APP_ENV`, exposes `appEnv`, `isProduction`, `isStaging`, `isDevelopment`, and the URL allow-list guard `checkSupabaseUrlAgainstAppEnv()`. |
| `src/lib/supabase.ts` | Calls the env guard at boot. Refuses to start (`throw`) when `VITE_APP_ENV=production` and the configured URL is not in `VITE_PRODUCTION_SUPABASE_URLS`. Logs warnings in staging/development. |
| `src/components/StagingBanner.tsx` | New non-dismissable banner shown when `appEnv !== 'production'`. Includes `data-testid="staging-banner"` and `data-env={appEnv}` for test selection. |
| `src/components/layout/PublicLayout.tsx`, `AdminLayout.tsx` | Render the banner above all content. |
| `src/components/ProtectedRoute.tsx` | Hardened guard: requires both `isAdmin` and `isElevatedAdminRole(profile.role)`. Non-admin users are redirected to `/admin/login` (not `/admin/dashboard`). |
| `src/lib/types.ts` | `UserRole` extended with `admin`, `content_manager`, `membership_manager`, `treasurer`, `media_moderator`, `ads_manager`. Exports `ELEVATED_ADMIN_ROLES`, `ADS_MANAGER_ROLES`, `MEMBERSHIP_MANAGER_ROLES`, `MEDIA_MODERATOR_ROLES`, and `isElevatedAdminRole()`. |
| `src/contexts/AuthContext.tsx` | Uses the centralised `isElevatedAdminRole()` helper rather than its own duplicated role list. |
| `src/pages/public/ContactPage.tsx` | Inserts `phone`, `inquiry_type`, `status`, plus a backwards-compatible legacy `type` value. Adds a hidden honeypot field (`company_website`). Tightens client-side validation. |
| `src/pages/admin/ContactsPage.tsx` | Reads both `status` (authoritative) and `is_read` (legacy). Mark-as-read writes both. Unread count uses `status`. Detail view shows `inquiry_type` and `phone`. |

---

## 3. Environment separation

- `.env` now declares `VITE_APP_ENV=staging` (the secret keys are unchanged).
- `.env.example` updated with full variable list and inline comments.
- `.env.staging.example` (new) — staging template.
- `.env.production.example` (new) — production template.

Defence-in-depth: when `VITE_APP_ENV=production`, the frontend will refuse to boot if the Supabase URL is not in the production allow-list. The same allow-list also blocks staging from accidentally pointing at a production URL.

---

## 4. Seed strategy

- `supabase/seed.sql` — header rewritten to a hard "LOCAL/DEMO ONLY — DO NOT RUN IN PRODUCTION" warning. The fictional content remains for local dev / Playwright tests only.
- `supabase/seed.production.example.sql` (new) — production-safe bootstrap. Idempotently inserts the KIGH community, primary domain, and governance settings. Inserts no people, no events, no fundraisers.

---

## 5. Documentation

- `docs/staging-production-duplication-brutal-assessment.md` — original audit (preserved unchanged; this run does not modify the historical record).
- `docs/security-hardening-run.md` (this file) — what changed in this run.
- `docs/staging-rls-security-fix-validation.md` (new) — manual SQL validation script and dashboard checks for staging.
- `docs/production-cutover-checklist.md` (new) — go/no-go checklist for the eventual production cutover.
- `docs/multi-community-domain-and-ads-foundation.md` (new) — design notes on the tenancy + ads model and the next steps to fully scope every legacy table.
- `README.md` — environment-separation section, updated env var table, updated production seed warning.

---

## 6. What is now safe (compared to the original audit)

| Audit item | Status after run |
|---|---|
| C1 `is_admin()` returns true for any authed user | **Fixed** by 013. The helper now delegates to `kigh_is_elevated_admin()`. Every existing policy that referenced `is_admin()` becomes safe automatically. |
| C2 `kigh-private-documents` readable by any authed user | **Fixed** by 013 + 019. Storage policies now use `kigh_is_elevated_admin()` directly. |
| C3 `contact_submissions` schema/code drift | **Fixed** by 018 + ContactPage/AdminContactsPage updates. New fields: `phone`, `inquiry_type`, `status`. Legacy `type`/`is_read` preserved and trigger-synced. |
| C4 fake seed data | **Mitigated.** `seed.sql` clearly marked local-only; `seed.production.example.sql` provides the production-safe alternative; README updated. |
| C5 members not linked to auth | **Mitigated** by 016. `members.user_id` exists; self-RLS in place; admin RPC `kigh_link_member_to_user` for membership_manager/community_admin. Member self-service UI is **not yet wired** — see remaining-blockers section. |
| C6 no AGM/quorum/good-standing model | **Fixed** by 014 + 016. `community_governance_settings`, `members.good_standing`, `members_in_good_standing` view, `kigh_agm_quorum_required` function. AGM scheduling/voting UI is out of scope for this run. |
| C7 no env separation | **Fixed.** `VITE_APP_ENV`, banner, allow-list guard, `.env.*.example`. |
| C8 storage admin policies | **Fixed** in 019. |
| D1 `gallery_images` default published | **Fixed** in 019 (default now `pending`). |
| D3 spam intake | **Partially mitigated.** Honeypot added on contact form; DB-level honeypot empty check. CAPTCHA still recommended pre-launch. |
| D5 two household models | **Documented.** Two-track model retained (existing data preserved); 016 adds `household_members.user_id` and self-RLS so the gap can be closed in a follow-up without data loss. |
| D6 audit log | **Foundation in place.** Table + writer RPC live; trigger-based auto-audit deferred. |
| D8 `admin_user_profiles` writable by any authed user | **Fixed** transitively via 013 — the `is_admin()` check now requires elevated role. |
| D10 stale `database.types.ts` | **Documented.** See remaining-blockers; regenerate via Supabase CLI once schema is final. |

---

## 7. Remaining blockers (deferred / require manual action)

The following items are documented in detail in
`docs/production-cutover-checklist.md`:

1. **Manual SQL validation** in staging Supabase to confirm RLS now behaves correctly. Script provided in `docs/staging-rls-security-fix-validation.md`.
2. **Manual Supabase dashboard checks**: confirm Auth signup is disabled in production project (when created); confirm storage buckets list is correct; confirm SMTP / email templates.
3. **CAPTCHA / Turnstile** integration on public submission forms (events, businesses, fundraisers, community groups, service interests, membership). Honeypot added; CAPTCHA still recommended.
4. **Member self-service UI** for `members` rows: list `members_in_good_standing` for the user, allow them to view/update their own application limited to non-status fields. Member can already do this via SQL RLS — UI not wired.
5. **`database.types.ts` regeneration** via `npx supabase gen types typescript --project-id <staging-ref> > src/lib/database.types.ts` after staging schema is final.
6. **Tenant scoping in RLS** for the rest of the legacy tables. 014 adds the column + index; future migrations should add per-table tenant predicates once the multi-tenant rollout is approved.
7. **Trigger-based audit** on critical tables (members, profiles, community_ads, resources, fundraisers, audit_logs is read-only on its own). Foundation is in place; triggers can be added without breaking existing flows.
8. **Production Supabase project** — not created in this run per instructions. See `docs/production-cutover-checklist.md`.
