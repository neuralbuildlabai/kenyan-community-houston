# Polls Standalone Pages — Implementation Report (2026-06-18)

## Summary

Extended the existing polls feature with **shareable standalone poll pages**, a **public polls index**, and a **prominent homepage featured poll banner**. No database or RLS changes were required — migration `046_polls.sql` already provides slugs, featured/active flags, close dates, and secure voting.

## What changed

### A. Standalone poll page (`/polls/:slug`)

- Loads poll by slug via `fetchPollBySlug()`
- Respects RLS: public sees active polls only; elevated admins can preview inactive polls (with banner)
- Shows question, description, close date, voting UI, results after vote/close
- Blocks voting when poll is closed
- SEO metadata via `SEOHead`
- Share section with copyable URL
- Clean not-found state for missing/inactive polls

### B. Polls index (`/polls`)

- Lists all active polls
- Featured polls first within open and closed sections
- Closed polls shown in a separate "Closed polls" section
- Each card links to `/polls/[slug]`

### C. Homepage featured poll

- Moved **immediately after the hero** (before "What's happening")
- Strong gold-accent banner with icon, headline, description
- Primary CTA: **"Vote in the poll"** → `/polls/[slug]`
- Embedded voting retained via shared `PollVotePanel` with **"Open full poll"** link

### D. Share link support

- `PollShareSection` on detail page with URL display and **Copy link** button (clipboard + toast)

### E. Voting behavior

- Unchanged: login required, one vote per member, results after vote or close, RLS enforcement
- Shared `PollVotePanel` preserves existing ballot/results/sign-in flows

### F. Admin

- Slug preview updated from `/{slug}` to `/polls/{slug}`
- Admin create/edit flow untouched

## Files changed

| File | Change |
|------|--------|
| `src/lib/pollsApi.ts` | Added `fetchPollBySlug`, `fetchActivePolls` |
| `src/lib/pollUtils.ts` | **New** — `isPollClosed`, `formatPollClosesAt`, `partitionPublicPolls` |
| `src/lib/pollUtils.test.ts` | **New** — unit tests |
| `src/components/polls/PollVotePanel.tsx` | **New** — shared voting UI |
| `src/components/polls/PollShareSection.tsx` | **New** — share/copy link |
| `src/components/landing/FeaturedPoll.tsx` | Redesigned banner + uses shared panel |
| `src/pages/public/PollDetailPage.tsx` | **New** |
| `src/pages/public/PollsIndexPage.tsx` | **New** |
| `src/pages/public/HomePage.tsx` | Moved featured poll placement |
| `src/pages/admin/AdminPollsPage.tsx` | Slug path display |
| `src/App.tsx` | Routes for `/polls` and `/polls/:slug` |
| `e2e/tests/polls.spec.ts` | **New** — index + not-found smoke tests |
| `docs/audits/polls-feature-audit-20260618.md` | **New** — Phase 1 audit |
| `docs/audits/polls-feature-standalone-implementation-20260618.md` | This report |

## Routes added

| Route | Component |
|-------|-----------|
| `/polls` | `PollsIndexPage` |
| `/polls/:slug` | `PollDetailPage` |

Example share URL: `https://yoursite.com/polls/mens-health-month-poll`

## DB / RLS changes

**None.** Existing schema and policies support standalone pages as-is.

## How to test manually

1. **Admin:** Create or feature a poll at `/admin/polls` with slug e.g. `mens-health-month-poll`
2. **Homepage:** Confirm gold banner appears after hero with "Vote in the poll" CTA
3. **Standalone:** Open `/polls/mens-health-month-poll` — vote (signed in), see results
4. **Share:** Use "Copy link" and open in incognito
5. **Signed out:** See options preview + sign-in CTAs; no results until poll closes
6. **Closed poll:** Set `closes_at` in past — voting blocked, results visible to all
7. **Index:** `/polls` lists open polls first, closed polls below
8. **Not found:** `/polls/nonexistent-slug` shows friendly empty state

## Automated checks run

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npm test` — pass (224 tests including 6 new poll utils tests)
- `npm run build` — pass

## Remaining risks / follow-ups

1. **E2e with live poll data** — smoke tests cover index/not-found only; full vote flow needs a seeded poll in test env
2. **Featured closed poll** — homepage still features polls past `closes_at` if `is_active` + `is_featured`; shows results (may be intentional)
3. **Nav discovery** — `/polls` is not in main nav yet; share links and homepage CTA are primary entry points
4. **Option editing** — still create-only (by design); document for admins when options need changing
