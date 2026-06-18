# Polls Feature Audit — 2026-06-18

## Current implementation summary

The KIGH polls feature was introduced in migration `046_polls.sql` and is wired end-to-end for **admin creation**, **homepage featured display**, and **member voting**. Polls are first-class database entities with slugs, but there is **no public route** to open a poll by slug — the only public surface is the optional homepage widget.

| Area | Status |
|------|--------|
| Database schema | Complete (`polls`, `poll_options`, `poll_votes`) |
| Slug field | Yes — unique, URL-safe constraint |
| Featured flag | `is_featured` (admin UI labels it "Featured on landing page") |
| Active / close date | `is_active`, optional `closes_at` |
| Public standalone page | **Missing** — no `/polls` or `/polls/[slug]` routes |
| Homepage prominence | **Weak** — widget sits below "What's happening" with muted styling |
| Voting | Authenticated members only; one vote per poll |
| Results visibility | After voting, after poll closes, or for elevated admins |

## Files inspected

| File | Role |
|------|------|
| `supabase/migrations/046_polls.sql` | Schema, RLS, RPCs |
| `supabase/migrations/055_revoke_anon_execute_on_non_public_functions.sql` | Anon revoke on `kigh_my_poll_vote` |
| `src/lib/pollsApi.ts` | Client API wrappers |
| `src/components/landing/FeaturedPoll.tsx` | Homepage widget |
| `src/pages/public/HomePage.tsx` | Featured poll placement |
| `src/pages/admin/AdminPollsPage.tsx` | Admin CRUD |
| `src/App.tsx` | Routing (admin `/admin/polls` only) |
| `docs/polls-feature.md` | Feature documentation |

## Database tables / functions / policies

### Tables

- **`polls`** — `id`, `slug`, `question`, `description`, `is_active`, `is_featured`, `closes_at`, audit columns
- **`poll_options`** — choices with `display_order`
- **`poll_votes`** — `unique (poll_id, user_id)` enforces one vote per member

### RPCs

- **`kigh_poll_results(p_poll_id)`** — SECURITY DEFINER; returns counts when caller has voted, is elevated admin, or poll has closed. Granted to `anon` + `authenticated`.
- **`kigh_my_poll_vote(p_poll_id)`** — returns caller's `option_id` or null. **Authenticated only** (anon revoked in migration 055).

### RLS highlights

| Table | Public read | Vote insert |
|-------|-------------|-------------|
| `polls` | Active polls only (`is_active = true`) | N/A |
| `poll_options` | Options on active polls | N/A |
| `poll_votes` | Own row only | Authenticated, active poll, not past `closes_at` |

Elevated admins can SELECT all polls/options/votes and mutate polls/options.

### Anonymous vs authenticated

- **View poll question/options:** Yes (active polls)
- **Vote:** No — login required (`poll_votes insert` policy + client check)
- **See results before voting:** No (unless poll closed)
- **See results after poll closes:** Yes via `kigh_poll_results` (anon allowed)

## Admin UI

- **Location:** `/admin/polls` (`AdminPollsPage.tsx`)
- **Create/edit:** Modal with question, slug (locked after create), description, options (create only, min 2), close date, active + featured checkboxes
- **Featured flag:** Wired via `setPollFeatured()` — clears other featured polls when enabling one
- **Active/inactive:** Toggle works; inactive polls hidden from public RLS
- **Close date:** Stored as ISO; admin card shows "Closed" badge when past
- **Validation:** At least 2 options on create; slug format validated

**Gap:** Admin card shows slug as `/{slug}` instead of `/polls/{slug}` (route did not exist).

## Homepage display

- **Query:** `fetchFeaturedPoll()` — `is_active = true AND is_featured = true`, newest first, limit 1
- **Count:** Single featured poll only (by design)
- **Closed polls:** Still fetched if `is_active` and `is_featured`; widget detects `closes_at` client-side and shows results / blocks voting
- **Placement:** After "What's happening" section (line ~435 in `HomePage.tsx`)
- **Why subtle:** `bg-muted/15`, thin border, no gold/CTA emphasis; competes visually with denser sections above; no link to a dedicated poll page

## Routing

| Route | Exists? |
|-------|---------|
| `/polls` | No |
| `/polls/[slug]` | No |
| `/admin/polls` | Yes |

Recommended structure: `/polls` index + `/polls/:slug` detail — matches events/announcements patterns.

## Voting behavior

1. **Submit:** `castPollVote()` inserts into `poll_votes` with current user id
2. **Duplicate protection:** DB unique constraint + RLS; second insert fails
3. **Results hidden until vote:** `kigh_poll_results` raises `P0001` if not eligible
4. **Results after vote:** Frontend refetches results; RPC succeeds
5. **Results after close:** RPC allows all viewers (including anon non-voters)
6. **Closed poll voting:** RLS blocks insert when `closes_at <= now()`; UI also gates on `pollClosed`

## Gaps found

1. No standalone public poll page or shareable URL route
2. No polls index page
3. Homepage widget placement too low and visually understated
4. No "Copy link" / share UI on poll pages
5. No unit or e2e tests for polls
6. Admin slug preview path incorrect (`/{slug}`)
7. `fetchFeaturedPoll` does not exclude polls past `closes_at` (still shows as featured CTA — acceptable if showing closed results, but worth documenting)

## Recommended implementation plan

### Phase 2 (this work)

1. **API** — Add `fetchPollBySlug`, `fetchPublicPollsList`, `isPollClosed` helper
2. **Shared UI** — Extract `PollVotePanel` (ballot + results) for reuse on homepage and detail page
3. **Routes** — `/polls` index, `/polls/:slug` detail with SEO, share section, not-found state
4. **Homepage** — Move featured poll immediately after hero; strong banner + CTA to `/polls/[slug]`; stronger embedded voting with "Open full poll" link
5. **Admin** — Update slug display to `/polls/{slug}`
6. **Tests** — Unit tests for poll helpers; optional e2e smoke for `/polls` not-found
7. **No DB migration required** — schema and RLS already support standalone pages

### Follow-ups (optional)

- E2e test with seeded poll in staging
- Filter featured fetch to prefer non-closed polls
- Nav link to `/polls` when active polls exist
