# Community polls

## 1. Purpose

Lightweight community engagement: an admin asks a question, the community
answers, and the most important question lives on the public landing page.
Use it for event-date polling, agenda-setting before town halls, gathering
input on programming priorities, or any quick pulse-check that's better
done in the app than over WhatsApp.

Introduced in migration **046**.

## 2. Admin workflow

1. Open **Admin → Polls** (sidebar under *Content*, between Leadership and
   Public submissions).
2. Click **New poll** in the top-right.
3. Fill in the editor modal:
   - **Question** — 3–240 characters. This is what voters see as the
     headline. Phrase it as a question (e.g., "Where should we host the
     summer picnic?").
   - **Slug** — auto-generated from the question while typing; you can
     override it before saving. Lowercase letters, numbers, and dashes;
     up to 80 characters. Slug is **locked after creation**.
   - **Description** (optional) — up to 1000 characters of plain-text
     context shown under the question. Markdown is not rendered.
   - **Options** — one per line, at least two required. Each option is
     1–200 characters.
   - **Closes at** (optional) — datetime-local picker. When set, votes
     are blocked after this moment and results become visible to
     everyone (including non-voters).
   - **Active** — when off, the poll is hidden from the public site but
     kept in the admin list. Use this to draft a poll before publishing
     or to retire an old one without deleting it.
   - **Featured on landing page** — when on, this poll renders in the
     `FeaturedPoll` widget on `/`. **Only one poll can be featured at a
     time** — toggling on automatically unfeatures any other featured
     poll.
4. Click **Create poll**. The list refreshes with live results inline.

### Editing a poll

Click **Edit** on any poll card to change the question, description,
close time, and active/featured flags. **Options are read-only after
creation** because existing `poll_votes` rows reference them by ID — see
§7 on data integrity. To change the options, delete the poll and create
a new one (or future enhancement: clone-poll).

### Featuring, deactivating, deleting

Inline buttons on each poll card:

- **Feature / Unfeature** — toggles `is_featured`. Mutually exclusive
  across active polls.
- **Deactivate / Reactivate** — toggles `is_active`. Inactive polls
  disappear from the public landing page and from anonymous viewers but
  remain in the admin list for reference.
- **Delete** (trash icon) — opens a confirm dialog. Deletion cascades to
  every option and every vote on the poll.

## 3. Public landing-page widget

Component: `src/components/landing/FeaturedPoll.tsx`. Mounted on the
homepage between "What's happening" and "Community moments".

Render states:

| Viewer state                       | What they see                                       |
| ---------------------------------- | --------------------------------------------------- |
| No poll featured                   | Widget renders nothing (no layout shift).           |
| Anonymous visitor                  | Question, options preview, **Sign in** / **Join**. |
| Signed-in member, hasn't voted     | Radio inputs + **Submit vote** button.              |
| Signed-in member, has voted        | Per-option tally with a check mark on their pick.   |
| Poll has closed (past `closes_at`) | Per-option tally visible to everyone.               |

The widget always shows totals like `42 votes · Thanks for voting` after
a successful vote. A poll with no votes shows `0 votes · 0%` per option
— intentional, so admins can see at a glance which polls need promotion.

## 4. Member voting rules

- **One vote per (poll, member).** Enforced by `unique (poll_id,
  user_id)` on `poll_votes`. A second insert returns a 23505 unique
  violation; the toast surfaces the error.
- **Single choice.** A poll has exactly one selected option per voter.
- **Votes are final.** No RLS policy permits `UPDATE` or `DELETE` on
  `poll_votes`, so once a vote is cast it cannot be changed — by anyone,
  including admins. This is deliberate: it makes results trustworthy and
  removes the "admin tipped the scales" failure mode.
- **Closed polls reject new votes.** RLS `with check` on the INSERT
  policy requires `closes_at is null or closes_at > now()`.

## 5. Results visibility — `kigh_poll_results(p_poll_id uuid)`

A `SECURITY DEFINER` function (defined in migration 046) that returns
`(option_id, label, display_order, vote_count)` per option, but only
when at least one of these is true about the caller:

1. The caller has a vote row in this poll (`poll_votes.user_id =
   auth.uid()`), **or**
2. `public.kigh_is_elevated_admin()` returns true, **or**
3. The poll's `closes_at` is in the past.

Otherwise the function raises an exception with SQLSTATE `P0001` and the
message `results hidden until you vote`. The frontend catches this and
leaves the ballot in place rather than showing partial data.

A second helper, `kigh_my_poll_vote(p_poll_id uuid)`, returns the
`option_id` the caller voted for (or `NULL`). The widget calls this to
decide which UI state to render before requesting the tally.

## 6. Data model

Three tables, all in `public`:

### `polls`

| Column         | Type          | Notes                                                                                            |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `id`           | `uuid`        | PK, default `gen_random_uuid()`.                                                                 |
| `slug`         | `text`        | Unique, `^[a-z0-9][a-z0-9-]{0,80}$`.                                                             |
| `question`     | `text`        | 3–240 chars, trimmed.                                                                            |
| `description`  | `text`        | Nullable; ≤ 1000 chars.                                                                          |
| `is_active`    | `boolean`     | Default `true`.                                                                                  |
| `is_featured`  | `boolean`     | Default `false`. Landing page picks the most recent featured + active poll.                      |
| `closes_at`    | `timestamptz` | Nullable. After this, votes blocked + results public.                                            |
| `created_by`   | `uuid`        | FK `auth.users(id) on delete set null`.                                                          |
| `created_at`   | `timestamptz` | Default `now()`.                                                                                 |
| `updated_at`   | `timestamptz` | Default `now()`; bumped by `set_updated_at` trigger.                                             |

Index: `polls_active_featured_idx (is_active, is_featured, created_at desc)`.

### `poll_options`

| Column          | Type          | Notes                                          |
| --------------- | ------------- | ---------------------------------------------- |
| `id`            | `uuid`        | PK.                                            |
| `poll_id`       | `uuid`        | FK `polls(id) on delete cascade`.              |
| `label`         | `text`        | 1–200 chars.                                   |
| `display_order` | `integer`     | Lower renders first within a poll.             |
| `created_at`    | `timestamptz` | Default `now()`.                               |

Index: `poll_options_poll_idx (poll_id, display_order)`.

### `poll_votes`

| Column       | Type          | Notes                                       |
| ------------ | ------------- | ------------------------------------------- |
| `id`         | `uuid`        | PK.                                         |
| `poll_id`    | `uuid`        | FK cascade.                                 |
| `option_id`  | `uuid`        | FK cascade.                                 |
| `user_id`    | `uuid`        | FK `auth.users(id) on delete cascade`.      |
| `created_at` | `timestamptz` | Default `now()`.                            |

Constraint: `unique (poll_id, user_id)`. Indexes on `poll_id` and
`user_id`.

## 7. RLS model (summary)

| Table          | SELECT                                                              | INSERT                                       | UPDATE / DELETE |
| -------------- | ------------------------------------------------------------------- | -------------------------------------------- | --------------- |
| `polls`        | anon + auth when `is_active=true`; elevated admin sees everything   | elevated admin only                          | elevated admin  |
| `poll_options` | anon + auth when parent poll `is_active=true`; admin sees all       | elevated admin only                          | elevated admin  |
| `poll_votes`   | own row (`user_id = auth.uid()`); elevated admin sees all           | auth user, own `user_id`, active poll, valid option | denied (no policy) |

Why options-write is admin-only even though "members can vote" — because
vote casting goes through `poll_votes`, not `poll_options`. Members
never write to `poll_options`.

Why `poll_votes` has no UPDATE/DELETE policy — see §4. Votes are final.

## 8. Operational notes

### Why options are locked after creation

`poll_votes.option_id` is a foreign key into `poll_options`. If an admin
renamed an option after votes came in, the vote rows would still point
at the same row — so the rename would silently rewrite history. We
preferred a hard "you can't edit options" rule over a "we'll rename it
and hope no one notices" behavior.

If a typo slips through, the cleanest fix is to delete the poll (which
cascades cleanly) and recreate it. Pollers haven't built up enough
attachment to a 24-hour poll for this to matter much.

### One-featured-at-a-time enforcement

There is no DB constraint forcing this — instead, the
`setPollFeatured(pollId, true)` API helper first updates every other
poll's `is_featured` to `false`, then sets the target poll. Two admins
toggling simultaneously could briefly leave two polls featured; the
landing-page fetcher tolerates this by selecting the most recently
created featured + active poll. The next toggle resolves the state.

### Auth identity

Votes are tied to `auth.users(id)` via `user_id`. A member who deletes
their account has all their votes cascade-deleted, which subtly affects
historical tallies. If you need permanent audit-grade history, archive
the result set to a docx/PDF after the poll closes.

### Spam / brigading

The platform's existing rate limits and email verification gate any new
account creation, so the practical attack surface is "one bad-faith
vote per attacker email." Acceptable for community engagement; not
acceptable for elections. If you ever run a real election, layer on
something stronger (e.g., member-tier-only voting, IP rate limiting,
manual member approval).

## 9. Apply order

1. Run migration **046_polls.sql** in Supabase SQL Editor against the
   production project.
2. Confirm `polls`, `poll_options`, `poll_votes` are visible in
   Database → Tables, and `kigh_poll_results` + `kigh_my_poll_vote`
   appear in Database → Functions.
3. Commit + deploy the frontend (already on `main` once you push).
4. Visit `/admin/polls` as an elevated admin, create a 2-option test
   poll, toggle **Feature**, and confirm the widget renders on `/`.
5. Sign in as a separate member account and cast a vote. Confirm the
   results panel appears with your selection marked.

## 10. Files

| Layer         | Path                                                       |
| ------------- | ---------------------------------------------------------- |
| Migration     | `supabase/migrations/046_polls.sql`                        |
| API helpers   | `src/lib/pollsApi.ts`                                      |
| Landing widget| `src/components/landing/FeaturedPoll.tsx`                  |
| Admin page    | `src/pages/admin/AdminPollsPage.tsx`                       |
| Routes        | `src/App.tsx` (route `/admin/polls`)                       |
| Sidebar       | `src/components/layout/AdminSidebar.tsx` (Content section) |
| Homepage      | `src/pages/public/HomePage.tsx` (mounts `<FeaturedPoll />`)|

## 11. Future enhancements (not built)

- **Clone poll** — copy question + options of an existing poll into the
  editor as a new draft.
- **Multi-select polls** — admin chooses whether voters pick one or
  many. Requires lifting the `unique (poll_id, user_id)` constraint and
  storing one row per (poll, user, option).
- **Anonymous polls** — allow non-members to vote with browser
  fingerprinting + IP rate limits. Higher participation, lower
  trustworthiness; only worth doing if a specific low-stakes use case
  comes up.
- **Comments on polls** — voters explain their pick. Probably wants a
  separate table and moderation queue.
- **Scheduled polls** — `opens_at` field plus a cron job to set
  `is_active = true` automatically. Today admins activate manually.
