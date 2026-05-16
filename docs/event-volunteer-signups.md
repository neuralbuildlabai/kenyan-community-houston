# Event volunteer signups

## 1. Purpose

KIGH previously used Google Forms for event volunteers. Migration **034** introduces a system-managed workflow: admins enable signup per event, share a link, and manage responses privately in the admin console.

## 2. Admin event workflow

1. Open **Admin → Calendar** and create or edit an event.
2. In **Volunteer signup**, turn **Enable** on.
3. Optionally set **Slots needed**, **Signup closes** (local datetime), and **Instructions** (max 500 characters).
4. Save the event. The app generates `volunteer_signup_slug` (aligned with the event slug when possible) and shows a **shareable link**, **Copy**, **Open**, and **WhatsApp** actions.
5. Review signups under **Admin → Volunteers**.

## 3. Shareable volunteer link

Public URL shape:

`/events/<event-slug>/volunteer`

Full URL uses `VITE_PUBLIC_SITE_URL` or `VITE_APP_URL` when set (see `buildVolunteerSignupUrl` in `src/lib/eventVolunteerSignup.ts`).

## 4. Volunteer signup form

Public page: `EventVolunteerSignupPage` at `/events/:slug/volunteer`.

- Explains privacy (name and phone visible only to authorized organizers).
- Optional aggregate: “Volunteers signed up: *n*” when the event has signup enabled (RPC `public_event_volunteer_signup_count`).

## 5. Required fields

- **Full name** (trimmed length 2–120).
- **Phone** (international rules; normalized before save).
- **Consent** checkbox: agreement that KIGH may contact the volunteer about this event.

## 6. Phone validation

- Client: `src/lib/phoneValidation.ts` (`validatePhoneNumber`) — optional leading `+`, digits only after normalization, 7–15 digits, no letters.
- Database: `event_volunteer_signups.phone` check constraint `^\+?[0-9]{7,15}$`.
- Signup path: `public.create_event_volunteer_signup` normalizes and validates again server-side.

## 7. Privacy model

- Volunteer **names and phone numbers** are **not** listed on public event pages.
- The public event page may show a **CTA** and an **aggregate count** only when signup is enabled and not closed.
- Row-level security on `public.event_volunteer_signups` allows:
  - **Elevated admins** (`public.kigh_is_elevated_admin()`): full `select`, `update`, `delete`.
  - **Authenticated users**: `select` only where `user_id = auth.uid()` (optional self-view).
  - **Anonymous**: no direct `select` on the table.
- **Inserts** for the public are performed only through the **security definer** RPC `create_event_volunteer_signup`, which enforces published events, signup enabled, close time, moderation, and duplicate phone per event.

## 8. Admin volunteer management

- **Admin → Volunteers** (`/admin/volunteers`): table of all signups with filters (event, status) and search (name or phone).
- Status values: `submitted`, `confirmed`, `waitlisted`, `cancelled`, `declined`.
- Updates use the Supabase client with elevated admin session; RLS enforces admin-only writes.

## 9. RLS model (summary)

| Action | Who |
|--------|-----|
| Insert row | RPC `create_event_volunteer_signup` (definer), not broad anon `insert` on table |
| Select | Elevated admin, or owner `user_id = auth.uid()` |
| Update / delete | Elevated admin |

## 10. Manual UAT steps (Supabase)

1. Apply migration `034_event_volunteer_signups.sql` to the UAT Supabase project (SQL editor or CLI — only when ready).
2. Confirm table `public.event_volunteer_signups` and new columns on `public.events`.
3. In SQL, verify `create_event_volunteer_signup` and `public_event_volunteer_signup_count` exist and `grant execute` includes `anon` and `authenticated` where expected.
4. Smoke-test RLS: as anon, `select` on `event_volunteer_signups` should return no rows; RPC signup for a **published** event with signup enabled should return a UUID.

## 11. Manual UAT steps (Vercel / app)

1. Deploy a build that includes this feature branch.
2. Admin: enable volunteer signup on a **published** test event; copy the volunteer link; confirm it opens the form.
3. Submit a volunteer signup (anonymous and, separately, logged-in member if available).
4. Admin **Volunteers** page: confirm row appears; change status; confirm public event page never lists phone/name.
5. Submit the same phone again for the same event; expect duplicate handling.

## 12. Future production duplication

When UAT is cloned to production, include migration **034** in the production migration chain. Re-point `VITE_PUBLIC_SITE_URL` / `VITE_APP_URL` to the production domain so generated share links and WhatsApp messages resolve correctly. No separate Twilio or SMS integration is introduced by this feature.
