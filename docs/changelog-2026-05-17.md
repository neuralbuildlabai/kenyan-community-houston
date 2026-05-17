# Changelog — 17 May 2026

A single working session covering one production bug ticket that branched into
a wider repair of the admin platform, a copy cleanup, and the rollout of
Google sign-up. Every change committed to `main`; production database updated
via Supabase SQL Editor where applicable.

## Summary at a glance

| Area | What changed | Why |
|---|---|---|
| Admin Users page | 500 on "Create admin" fixed | Edge Function was writing to a read-only view; rewritten to write to the underlying tables. |
| DB permissions | Migrations 041 + 042 + 043 + 044 | Closed several pre-existing grant/RLS holes; "Other" profession no longer blocked by a check constraint. |
| Admin UX | Stale "Deploy Edge Function" banner removed | The Edge Functions are deployed; banner was misleading. |
| Public copy | All references to internal infrastructure removed | Users should not see vendor / tooling names. |
| Auth | Google sign-up enabled with branded consent screen | New members can join with one click via Gmail. |
| Member admin | "Other" profession works without a follow-up description | Reflects new product decision; constraint relaxed and UI simplified. |

## 1. Create-admin-user 500 — root cause and fix

**Symptom.** Submitting the "Add Admin User" form returned HTTP 500 from the
`create-admin-user` Edge Function. Toast displayed
`"Unable to save login profile (profiles)"`.

**Root cause chain (took five layers to fully resolve).**

1. The Edge Function was upserting into `public.admin_users`, which is a
   *view* (not a table) and therefore not writable. Migration 002 created it
   as a view; 010 redefined it as a join view of
   `auth.users + profiles + admin_user_profiles`.
2. An in-progress edit on the function had introduced a regression — the
   final `profiles` upsert used `onConflict: 'user_id'` instead of `'id'`,
   so PostgREST rejected the call.
3. With those fixed, the next failure surfaced: the `service_role` could not
   execute `kigh_default_community_id()` (no EXECUTE grant beyond
   `anon` / `authenticated`).
4. Granting EXECUTE exposed the next layer: the function itself could not
   `SELECT` from `public.communities` because it ran as the caller, not the
   owner, and `service_role` had no SELECT grant on the table.
5. Granting SELECT exposed migration 031's three validator helpers, which
   had been revoked from `public` and never re-granted to anyone — so any
   write touching `profiles.professional_field` or `members.professional_field`
   was blowing up on a CHECK constraint regardless of who the caller was.

**Resolution.**

- Edge Function rewritten to write to `profiles` (the role + email source) and
  `admin_user_profiles` (security metadata) instead of the read-only view.
- Migration 041 (band-aid) and migration 042 (structural) granted the
  helpers EXECUTE to all three API roles, and made
  `kigh_default_community_id()` `SECURITY DEFINER` so caller-role does not
  need its own SELECT grant on `communities`.

**Files changed.**

- `supabase/functions/create-admin-user/index.ts` — fully rewritten write
  path; added diagnostic logging (`[create-admin-user <id>]`) that pays
  off any time the function fails in the future.
- `src/lib/createAdminUserEdgeFunction.test.ts` — assertions updated to
  reflect the new (correct) write order; added a test that explicitly
  forbids future regressions of upserting into the `admin_users` view.

## 2. Permission hardening — migrations 041 / 042 / 043

| Migration | Purpose |
|---|---|
| `041_grant_default_community_id_to_service_role.sql` | Immediate unblock: grant EXECUTE on `kigh_default_community_id()` to `service_role`, SELECT on `public.communities` to `service_role`, EXECUTE on the three migration-031 validators to all API roles. |
| `042_helper_function_permissions_hardening.sql` | Permanent fix: recreate `kigh_default_community_id()` as `SECURITY DEFINER` with `set search_path = public`. Re-grant EXECUTE next to each function definition so the access model lives with the function. |
| `043_elevated_admin_rls_repair_legacy_tables.sql` | Rebuild the legacy "Admins have full access to X" RLS policies on `events`, `announcements`, `businesses`, `fundraisers`, `sports_posts`, `gallery_albums`, `contact_submissions`, `service_interests` using the modern `to authenticated using (public.kigh_is_elevated_admin())` shape. Eliminates the `is_admin()` indirection chain that was returning 403s for elevated admins on pending-content queries. Adds explicit table grants for defense in depth. |

After 042 ships, any future server-side write to a tenant-scoped table works
out of the box — no more chasing grants per-function.

## 3. Frontend cleanup — internal tool names removed

A second pass scrubbed every user-visible mention of vendor / infrastructure
names. Code comments, type imports, and env-var names were left alone — only
strings rendered to users / admins were touched.

| File | Change |
|---|---|
| `src/pages/public/MembershipPage.tsx` | Three "stored by Supabase Auth" lines reworded to plain English. |
| `src/pages/public/PrivacyPage.tsx` | "Your data is stored securely using Supabase (hosted on AWS)" replaced with a vendor-neutral phrasing. |
| `src/pages/admin/UsersPage.tsx` | Banner about deploying Edge Functions removed entirely. "Edge Function (service role)" descriptions reworded as "Create or revoke admin accounts". |
| `src/pages/admin/AdminResourcesPage.tsx` | Two mentions of "Supabase Storage" replaced with "secure private storage". |
| `src/pages/admin/AdminSystemHealthPage.tsx` | "Supabase host" label changed to "Database host". |
| `src/lib/edgeFunctionErrors.ts` | Generic network-failure copy ("Deploy the Edge Function and ensure CORS...") replaced with user-friendly "Could not reach the server..." |

`.gitignore` was also extended to keep operator-only production cutover
scripts (`scripts/cleanup-*-prod.mjs`, `scripts/copy-*-uat-to-prod.mjs`,
`backups/`) out of source control.

## 4. Google sign-up rolled out

**Wiring.** The code path already existed but was gated behind
`VITE_ENABLE_GOOGLE_AUTH`. To turn it on we needed three configurations:

1. **Google Cloud Console.** Created OAuth consent screen, OAuth client.
   Authorized redirect URI now points at the custom auth domain.
2. **Supabase.** Enabled Google provider with Client ID + secret. Verified
   `auth.kenyansingreaterhouston.org` as a custom auth domain (CNAME +
   ACME TXT records at GoDaddy DNS → Supabase issues TLS cert).
3. **Vercel.** Added `VITE_ENABLE_GOOGLE_AUTH=true` to production env;
   redeployed.

**Branded consent screen.** Before the custom domain, Google's consent UI
showed `to continue to tzrlwleaycawpkzmbqxr.supabase.co`. After the custom
domain went active and the new redirect URI was added, the consent screen
reads `to continue to auth.kenyansingreaterhouston.org`. The legacy
`tzrlwleaycawpkzmbqxr.supabase.co/auth/v1/callback` redirect was removed
from the Google OAuth client once we'd confirmed the branded flow worked.

**End user impact.** On `/membership` and `/login`, users now see
"Continue with Google" alongside email/password. Sign-in via Google
auto-creates a `profiles` row using Google's `full_name` and `picture`,
syncs a `members` row, and applies the password policy gate.

## 5. "Other" profession — constraint relaxed

**Symptom.** Admins selecting "Other" for a member's professional field in
`/admin/members` hit a 23514 check-constraint violation
(`members_professional_other_ok`).

**Root cause.** Migration 031 added a constraint that required
`professional_field_other` to be 1–80 chars whenever
`professional_field = 'other'`. The admin UI didn't prompt for a follow-up
description, so saves always failed. The public membership form and the
member profile page *did* prompt for a description, but the product
decision is that "Other" should stand alone.

**Resolution.**

- `supabase/migrations/044_relax_professional_other_constraint.sql` —
  redefines `kigh_professional_other_ok` to allow `professional_field='other'`
  regardless of whether `professional_field_other` is set. A 80-char cap on
  the description column is preserved for any legacy values.
- UI: removed the conditional "Describe (required if Other)" inputs from
  `src/pages/admin/AdminMembersPage.tsx`,
  `src/pages/public/MembershipPage.tsx`,
  `src/pages/member/ProfilePage.tsx`.
- `src/lib/profilePayload.ts` — `normalizeLocationProfession` no longer
  validates or carries the description; always returns
  `professional_field_other: null`.
- Tests in `src/lib/profilePayload.test.ts` updated.

## 6. Operational notes & follow-ups

- **Edge Function diagnostic logs.** The `create-admin-user` function now
  emits `[create-admin-user <8-char-id>]` log lines at every step. Harmless
  in production; immediately useful the next time something fails.
- **Diagnostic patterns that paid off.** When PostgREST returns a 500 from
  an Edge Function, look at the Network tab response body — the structured
  `{ ok, code, message, details }` payload has the verbatim Postgres error
  string in `details`. That short-circuits at least 80% of guesswork. The
  edge-function logs in the Supabase dashboard are equivalent.
- **Service-role grants posture.** The `service_role` is not automatically
  granted EXECUTE on user-defined helper functions or SELECT on every
  tenant table. The migration-042 pattern — `SECURITY DEFINER` for any
  helper that reads from tenant tables, explicit EXECUTE grants for the
  pure-data validators — should be the template for any future helpers.
- **Custom auth domain.** `auth.kenyansingreaterhouston.org` is now the
  branded host for *every* auth flow, not just Google: password reset
  emails, magic links, and email confirmation also use the branded URL.

## 7. Commits shipped today (chronological)

| Commit | Message |
|---|---|
| `adbbda2` | `fix(create-admin-user): write to base tables; grant service_role exec on default helpers` |
| `5be04f3` | `feat(db): make tenant-default + validator helpers safely callable from any API role` |
| `f323a0b` | `fix(rls): rebuild legacy admin policies; remove edge-fn deploy banner` |
| `f2c1479` | `chore(copy): remove internal tool names from user-facing strings` |
| (next) | `chore(gitignore): exclude operator-only prod cutover scripts and local backups` |
| (next) | `feat(members): allow 'Other' profession without follow-up description` |
| (next) | `docs: changelog + admin guide for today's session` |

## 8. Migrations applied to production

All four were run via the Supabase SQL Editor against the production
project (`tzrlwleaycawpkzmbqxr`) and are also committed to `main` for
fresh-environment replay.

- `041_grant_default_community_id_to_service_role.sql`
- `042_helper_function_permissions_hardening.sql`
- `043_elevated_admin_rls_repair_legacy_tables.sql`
- `044_relax_professional_other_constraint.sql`
