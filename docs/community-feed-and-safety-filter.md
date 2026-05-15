# Community Feed and automatic safety filter

## 1. Feature overview

The Community Feed (`/community-feed`) is a public, member-driven social surface for community updates, questions, reminders, resources, celebrations, and referrals. It is separate from **Community Requests** (private tracked threads), **Event comments** (event-scoped Q&A), and **WhatsApp invites**.

Admins moderate via **Community Feed Moderation** (`/admin/feed`).

## 2. Approved-member-only posting

Posting, commenting, and liking require a signed-in user who is either:

- linked to a `members` row with `membership_status = 'active'`, or
- an elevated admin (`public.kigh_is_elevated_admin()`).

The SQL helper `public.kigh_is_approved_member()` encodes the active-membership check for reuse in RLS and client calls.

## 3. Auto-approved posts

Member posts are inserted with `status = 'approved'` after passing membership, rate limits, and the safety filter. There is no `pending` queue for normal feed posts.

## 4. Posting limits

Enforced in `public.create_feed_post` (not only in the UI):

- **1 post per calendar day** (America/Chicago date boundary).
- **3 posts per rolling 7 days** (`now() - interval '7 days'`).

Elevated admins bypass these limits. The RPC `public.feed_post_limit_status()` exposes a JSON hint for the composer.

## 5. Comment rules

- Comments are created through `public.create_feed_comment`.
- Only **approved** feed posts accept new comments unless the author is an elevated admin (moderation reply path).
- Post owners can toggle `comments_enabled` via `public.toggle_feed_post_comments`.

## 6. 200-character comment limit

`feed_comments` has a check constraint `char_length(trim(body)) between 1 and 200`. The UI enforces the same with `maxLength={200}`.

## 7. Post owner comment disable / enable

Owners (or admins) call `toggle_feed_post_comments`. Existing approved comments remain visible; new member comments are blocked when disabled, except elevated admins who may still comment for official moderation.

## 8. Admin moderation

Admins use `public.moderate_feed_post` and `public.moderate_feed_comment` to set `approved`, `hidden`, or `removed`, with optional preset reasons mapped in the admin UI.

## 9. Automatic community-safety filter

### SQL

- `public.kigh_normalize_text_for_moderation`
- `public.kigh_contains_blocked_language`
- `public.kigh_contains_sensitive_public_sharing` (email / phone / simple street pattern)

Used in feed RPCs, `event_comments` insert trigger, `member_invites.personal_note` trigger, and **profanity-only** checks on `create_chat_request` / `chat_messages` (so members can still share contact info privately with admins when appropriate).

### Frontend

`src/lib/communityModeration.ts` mirrors the intent for pre-submit validation on the feed, event comments, invites, and community request bodies/replies (profanity path for requests).

## 10. Safe public display name

`public.kigh_feed_safe_display_name` and `src/lib/memberDisplayName.ts` implement **first name + last initial** (e.g. `Sara O.`), **Kenyan Community Houston** for elevated admin authors, and **Community Member** when no safe name is available.

## 11. Privacy model

Public list RPCs return only sanitized display names and post/comment bodies—never email, phone, street address, or membership internals.

## 12. RLS model

- `feed_posts` / `feed_comments`: public read of approved chains; authors read own rows; admins full DML; **no direct INSERT** for authenticated clients (RPC `SECURITY DEFINER` inserts).
- `feed_reactions`: public read on approved posts; members insert/delete own likes when approved; admins can delete any reaction.

## 13. Migration

`supabase/migrations/032_community_feed_and_safety_filter.sql`

## 14. Manual UAT steps (Supabase)

1. Apply migration 032 to the UAT database (`supabase db push` or SQL editor), **only when ready**.
2. Smoke-test RPCs: `kigh_is_approved_member`, `feed_post_limit_status`, `list_community_feed_posts`, `create_feed_post`, `create_feed_comment`, `toggle_feed_post_comments`, `moderate_feed_post`, `moderate_feed_comment`.
3. Confirm RLS with a non-admin JWT cannot insert into `feed_posts` directly.
4. Confirm triggers reject obviously toxic `event_comments` and `member_invites.personal_note` text.

## 15. Manual UAT steps (Vercel / app)

1. Deploy branch with migration already applied to linked Supabase UAT.
2. Visit `/community-feed` logged out, logged in pending, and logged in active member.
3. Confirm `/admin/feed` is admin-only.
4. Verify like/comment/post limits and moderation flows.

## 16. Future production duplication

- Duplicate Supabase project + run migrations 001–032 in order on production.
- Point production env vars at the new Supabase URL and keys.
- Re-seed or migrate data per your promotion playbook; keep blocked-term lists aligned between SQL and TS or move to a single edge function.

## 17. Future enhancements

- AI-assisted moderation and user reporting.
- Stronger rate limiting (IP / device signals) at the edge.
- Media attachments after storage and RLS review.
- Notifications for replies and mentions.
- Additional reaction types.
- Aggregate community maps only after a dedicated privacy review.
