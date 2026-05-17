# KIGH Admin Roles & Operations Guide

A reference for the three admin role tiers — **super_admin**, **platform_admin**,
**community_admin** — describing what each can do, how to do common things,
and where to look when something goes wrong.

This guide assumes you can already sign in to the admin area at
`/admin` (e.g. https://kenyansingreaterhouston.org/admin/dashboard).

> **See also:** [`kigh-system-user-manual.md`](./kigh-system-user-manual.md) for
> the wider system manual covering every user type (public visitors, members,
> admins). This document is more focused — it goes deep on the admin tiers
> specifically and walks through operational tasks.

---

## 1. The role tiers at a glance

| Role | Tier | Purpose |
|---|---|---|
| `super_admin` | Platform owner | Highest authority. Sees every page. Creates and deletes admin users at any tier. Manages billing / infra / DNS. |
| `platform_admin` | Platform operator | Day-to-day platform operator. Can do most things `super_admin` can except create or remove platform-level accounts. |
| `community_admin` | Community lead | Owner of one community's day-to-day operations. Approves/rejects content, manages members, assigns junior moderators. |

There are also more specialised roles — `content_manager`, `membership_manager`,
`treasurer`, `media_moderator`, `ads_manager`, `business_admin`, `support_admin`,
`moderator`, `viewer`, `member` — handed out by the admins above to scope down
access. They are covered briefly in §6.

---

## 2. Permissions matrix

### What each role can *create* (i.e. invite as a new admin)

| Caller role | Can assign these roles |
|---|---|
| `super_admin` | every role, including another `super_admin` |
| `platform_admin` | every role *except* `super_admin` and `platform_admin` (no peer creation, no escalation) |
| `community_admin` | `media_moderator`, `ads_manager`, `business_admin`, `support_admin`, `moderator`, `viewer`, `member` |

The Edge Function `create-admin-user` enforces this server-side regardless of
what the UI lets you select.

### Who can do what across the rest of the admin area

| Capability | `super_admin` | `platform_admin` | `community_admin` |
|---|:-:|:-:|:-:|
| View Dashboard / Analytics | ✓ | ✓ | ✓ |
| Manage members (`/admin/members`) | ✓ | ✓ | ✓ |
| Approve / reject public submissions | ✓ | ✓ | ✓ |
| Edit calendar, content, gallery | ✓ | ✓ | ✓ |
| Reply to contact messages / chats | ✓ | ✓ | ✓ |
| Create admin users | ✓ | ✓ (limited tier) | ✓ (limited tier) |
| **Delete admin users** | ✓ | — | — |
| **System Health page** (`/admin/system-health`) | ✓ | ✓ | — |
| **Site settings** (`/admin/settings`) | ✓ | ✓ | — |

> "Delete admin users" is the most consequential single-action; it is
> intentionally restricted to `super_admin`. If a `platform_admin` or
> `community_admin` needs to remove an account, escalate to a `super_admin`.

---

## 3. The admin sidebar — what each section does

| Section | Pages | Notes |
|---|---|---|
| **Overview** | Dashboard, Analytics | KPI cards, weekly engagement, top content. Read-only by design. |
| **KIGH** | Calendar, Resources, Members | The community's core records. Calendar is the public events calendar. Resources is the link/file library. Members is the membership roster. |
| **Content** | Announcements, Businesses, Community groups, Fundraisers, Gallery | The "things you can publish on the public site." Each has Draft → Pending → Published lifecycle. |
| **Inbox** | Public submissions, Contact messages, Community requests, Event comments, Volunteers, WhatsApp invites, Community Feed, Call to Serve, Media submissions | Anything that came *into* the site from outside and needs review. |
| **System** | System Health, Site settings, Admin users | Reserved for elevated tiers. |

If a sidebar item is hidden for you, it's because your role does not have
access — not a bug.

---

## 4. Common workflows

### 4.1 Creating a new admin user

1. Navigate to **System → Admin users**.
2. Fill in **Email**, a **Temporary password** (must be strong — at least 8 chars
   with letters, digits, symbols), and pick a **Role** from the dropdown. The
   dropdown only shows roles you're allowed to assign.
3. Optional: **Display name** ("Jane K.") and **Position title** ("Vice Chair").
4. Click **Create admin**.

The new user receives no automatic email — you must share the temporary
password securely (encrypted message, password manager link, in person). On
first sign-in they will be forced to change it before they can do anything.

If the form returns an error:

- *"Your role (X) is not permitted to assign role 'Y'"* — pick a role from
  within your assignable set (see §2).
- *"Unable to save login profile (profiles)"* — a DB write failed; check the
  Edge Function logs in Supabase (Edge Functions → `create-admin-user` →
  Logs) for a `[create-admin-user <id>] ... failed <message>` line.

### 4.2 Removing an admin user (super_admin only)

1. **System → Admin users**.
2. Click the red trash icon on the row.
3. Confirm in the dialog.

This deletes the underlying auth account too. The user loses access
immediately. There is no undo.

### 4.3 Reviewing pending public submissions

1. **Inbox → Public submissions**. Tabs across the top (Events / Announcements /
   Businesses / Fundraisers) show counts.
2. Click a row to expand details and any attached flyer.
3. For each item:
   - **Approve** publishes it. Announcements with "include in calendar" also
     create a matching event.
   - **Reject** keeps the row for audit but removes it from the public site.
4. Repeat per tab.

### 4.4 Managing members

1. **KIGH → Members**.
2. Search by name / email or filter by membership status (pending / active /
   inactive / rejected) and dues status.
3. Click **Details** on a row to open the member panel:
   - Approve a pending member → set Status to `active` and Dues to `paid`
     or `waived`.
   - Update demographics (general location area, professional field).
     "Other" is a valid stand-alone choice — no follow-up description needed.
   - Toggle "Willing to volunteer" / "Willing to serve" if the member asked
     you to.
4. Use **Export CSV (filtered)** for a quick download of whatever the current
   filter shows.

### 4.5 Reviewing media submissions (private)

1. **Inbox → Media submissions**.
2. Each row carries a signed preview URL that expires after a short window.
3. Approve / reject as appropriate. Approved media moves to the gallery
   pipeline.

### 4.6 Replying to contact messages

1. **Inbox → Contact messages**.
2. Click a message to expand. You'll see the submitter's email, message body,
   and any tagged category.
3. Either:
   - Reply directly from your own email client (the address is shown), or
   - Mark the submission as **Handled** so it leaves the New queue.

### 4.7 Posting an announcement / event

1. **Content → Announcements** (or Events / Businesses / Fundraisers /
   Community groups / Gallery).
2. Click **Add** in the top right.
3. Fill in the form, attach images / flyers where applicable.
4. Save as **Draft** (only you see it) or **Published** (live on the site).

### 4.8 Posting on behalf of someone else

If you're approving content a member submitted but you want to change the
attribution, use the public submissions queue (§4.3) and approve from there
rather than re-creating the row.

---

## 5. Security and operational hygiene

### Passwords

- Every admin must change their initial password on first sign-in (enforced
  by the password gate).
- Passwords expire after 180 days. Members will be redirected to
  `/admin/change-password` until they rotate.
- Don't share accounts. If two people need access, create two accounts.

### Roles and least privilege

- Hand out the most specific role that fits. Use `moderator` for someone who
  only needs to triage submissions; reserve `community_admin` for community
  leads.
- When a person leaves the community, demote or delete (super_admin) their
  account the same day. There is no automatic deactivation.

### Sharing temporary passwords

- Never paste a password into Slack / WhatsApp / email plaintext. Use a
  password manager's secure-share link, or share verbally on a call.
- After the user signs in once and rotates their password, the temporary
  one is unusable.

### Public-facing data

- Anything in the `Content` section is publicly visible on `/events`,
  `/announcements`, `/businesses`, etc. Treat it accordingly.
- Member data is private. The roster page is for admins only; CSV exports
  are too.
- Contact messages are private. Do not paste their contents elsewhere.

### Things only `super_admin` should touch

- Adding / removing admin accounts at the platform-admin or super-admin
  tier.
- DNS / domain configuration (e.g. `auth.kenyansingreaterhouston.org`).
- Anything in Google Cloud Console (OAuth client, consent screen).
- Anything in Vercel (env vars, deploy settings).
- Any direct database changes via the Supabase SQL Editor.

---

## 6. The specialised sub-roles (assigned by an admin above)

| Role | Typical scope |
|---|---|
| `content_manager` | Edits everything in **Content** (announcements, events, gallery, etc.). |
| `membership_manager` | Reviews and edits members; approves pending memberships. |
| `treasurer` | Reads financial reports, manages dues status. |
| `media_moderator` | Reviews **Inbox → Media submissions** only. |
| `ads_manager` | Manages community ads and sponsorships. |
| `business_admin` | Reviews and edits **Content → Businesses** only. |
| `support_admin` | Handles **Inbox → Contact messages** and community requests. |
| `moderator` | Catch-all reviewer for submission inboxes. |
| `viewer` | Read-only access to all admin pages. Cannot edit anything. |
| `member` | Standard signed-up user; not an admin at all. |

All of these are subordinate to `community_admin`, which is in turn
subordinate to `platform_admin` and then `super_admin`.

---

## 7. Troubleshooting

### "Why is the dashboard showing red 403 errors in the browser console?"

The dashboard fetches counts for pending content from
`events`, `announcements`, `businesses`, `fundraisers`. RLS only lets
elevated admins see pending rows. If a `member`-level user navigates to
`/admin/dashboard` directly, those queries 403. This is the database
correctly refusing — not a bug.

If you yourself are an admin and you see this, it usually means your
session is somehow signed in as a `member` (e.g. you signed up via Google
but were never promoted). Ask a `super_admin` to elevate your role on
`/admin/users`.

### "I can't see the **System Health** or **Site settings** items in the sidebar."

That's by design — those pages are restricted to `super_admin` and
`platform_admin`. If you need access, ask a `super_admin` to upgrade your
role.

### "A member is stuck on 'Change password' and can't get in."

Common cause: an admin issued them a temporary password but they have
never rotated it, and the 180-day expiry has passed. A `super_admin` or
`platform_admin` can:

1. Go to **System → Admin users** (for an admin) or **KIGH → Members**
   (for a regular member).
2. Issue a fresh temporary password.
3. Share it securely with the user.

### "Submission counts in the Inbox don't match what I expect."

The counts in the sidebar / dashboard / tabs are computed via separate
queries. If they look wrong, hard-refresh the page (Cmd+Shift+R) — most
likely a stale cached count. If the mismatch persists, check Supabase for
rows where `status` is something unexpected (e.g. `archived`).

### "I created an admin user but they say they can't sign in."

Walk through:

1. Did they receive the temporary password? They cannot reset it
   themselves until they have signed in once.
2. Are they using the exact email you typed? Email lookup is
   case-insensitive but typos still bite.
3. Did they wait for the change-password redirect to complete? On first
   sign-in they're forced through `/admin/change-password`.
4. If still stuck, in Supabase **Authentication → Users**, confirm the
   user record exists and `email_confirmed_at` is set. If it isn't,
   their record didn't fully create — recreate via the admin form.

### "Where do I see what went wrong in a server-side action?"

Three places, in order of usefulness:

1. **Network tab in the browser DevTools.** The failing request's
   *Response* tab carries a structured JSON error with `code`,
   `message`, and `details`. `details` is usually the verbatim Postgres
   error.
2. **Supabase Dashboard → Edge Functions → `<function>` → Logs.** Look
   for `[create-admin-user <id>]` or similar tagged log lines.
3. **Supabase Dashboard → Logs → Postgres** for raw DB errors that didn't
   bubble through an Edge Function.

---

## 8. Quick reference card

```
Day-to-day pages:
  /admin/dashboard         — overview
  /admin/members           — roster, approvals, dues
  /admin/submissions       — public submission inbox (Events/Announcements/Businesses/Fundraisers)
  /admin/media-submissions — private media submission inbox
  /admin/contacts          — contact-form messages
  /admin/chat              — community request threads
  /admin/announcements     — manage announcements
  /admin/events (calendar) — manage events
  /admin/gallery           — moderate gallery images / albums

Elevated only:
  /admin/users             — admin user management (creating/deleting)
  /admin/settings          — site-wide settings (platform_admin+, super_admin)
  /admin/system-health     — infrastructure / DB health (platform_admin+, super_admin)
```

---

*Document maintained alongside the code. If a step here disagrees with what
the app actually does, the app is right and this guide is stale — please
open a PR or message a `super_admin`.*
