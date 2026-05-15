# Member WhatsApp invites, Houston-area location, and profession metrics

This document covers features added in **`supabase/migrations/031_member_invites_location_profession_metrics.sql`**.

## 1. WhatsApp invite workflow

1. A **signed-in** member opens **Invite Someone** (e.g. on `/chat` or **My profile**).
2. They enter recipient phone (required), optional name, optional personal note (≤300 chars).
3. The app **validates and normalizes** the phone to digits for `https://wa.me/{digits}?text=…`.
4. A row is inserted into **`public.member_invites`** with `status = 'opened_whatsapp'` and the full invite message text (audit trail).
5. The browser opens WhatsApp in a new tab. The user must tap **Send** in WhatsApp — the platform **does not** send SMS or claim delivery.

## 2. Why the platform does not send SMS

- No Twilio or other SMS provider is integrated.
- No server-side outbound messaging is performed for invites.
- Invites are **member-initiated** deep links to WhatsApp only.

## 3. Invite tracking status

| Status             | Meaning                                                |
|--------------------|--------------------------------------------------------|
| `opened_whatsapp`  | Site recorded the attempt and opened `wa.me` for the member. Not “delivered”. |
| `cancelled`        | Reserved for admin housekeeping if used later.       |

## 4. General Houston-area location

- Stored on **`public.profiles`** and **`public.members`** as `general_location_area`.
- Allowed values are a fixed list of broad Houston-metro areas (see `src/lib/memberDemographics.ts`).
- **Required** on new membership submissions via **`submit_membership_registration`** (RPC validates).
- **Required** when saving **My profile** (app validation).
- Legacy rows may have `NULL` until members update; DB columns stay **nullable** for safe UAT rollout.
- **“Prefer not to say”** is intentionally **not** an option for this field.

## 5. Professional field metric

- Columns: `professional_field`, `professional_field_other` (max 80 chars).
- Optional on membership and profile; if `professional_field = 'other'`, **`professional_field_other`** is required (app + DB checks).
- Used for **aggregate** reporting only on public-facing pages — individual values are not shown on public routes.

## 6. Privacy model

- Phone numbers, street addresses, and household PII are **not** exposed on public pages as part of this feature.
- General location and profession appear **only in admin aggregate** views (Analytics RPC).
- `member_invites` is protected by RLS: members see **only their own** rows; elevated admins see all.

## 7. Admin metrics

- **`kigh_admin_member_demographics()`** (elevated admin only) returns JSON with:
  - `total_linked_members`
  - `by_location` — counts and % for `members.user_id is not null`
  - `by_profession` — same for `professional_field` (missing values bucketed as `not_specified`)
- Surfaced on **Admin → Analytics** after migration 031 is applied.

## 8. RLS model (`member_invites`)

- **INSERT**: `invited_by = auth.uid()` (authenticated only).
- **SELECT**: own rows **or** elevated admin (`is_admin()`).
- **UPDATE / DELETE**: elevated admin only.
- **Anonymous**: no access.

## 9. Migration

- **File:** `supabase/migrations/031_member_invites_location_profession_metrics.sql`
- **Tables:** `member_invites`; new columns on `profiles`, `members`
- **RPCs:** `kigh_admin_member_demographics()`; updated `submit_membership_registration(jsonb)`

## 10. Manual UAT steps

1. Apply migration to the UAT Supabase project (`supabase db push` or run SQL in a maintenance window).
2. **Membership:** submit as a test user — confirm general location required, profession optional / Other validation.
3. **Profile:** save with location + profession; confirm `members` row updates when linked.
4. **Invite:** sign in, send invite, confirm `member_invites` row and `opened_whatsapp` status.
5. **Admin:** `/admin/invites` lists attempts; `/admin/analytics` shows demographic bars when data exists.

## 11. Future production duplication

- Promote the same migration and env (`VITE_PUBLIC_SITE_URL`) to production.
- Re-run UAT checklist on the production project before switching DNS.

## 12. Future enhancements

- Public aggregate map **only** after privacy/legal review.
- Rate limiting and abuse reporting on invites.
- Optional Edge Function if a **approved** messaging provider is adopted later.
- Email digest of pending invites for admins (no fake delivery metrics).
