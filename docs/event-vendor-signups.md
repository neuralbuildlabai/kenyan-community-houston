# Event vendor signups

## 1. Purpose

Migration **050** introduces a system-managed vendor signup
workflow for KIGH events. Vendors apply through a public form,
see a fee based on category (food or other), and receive
payment instructions for the KIGH treasurer's CashApp, Venmo,
and PayPal accounts. Organizers manage signups and mark
payments received from the admin console.

This mirrors the architecture of the volunteer signup feature
(migration **034**, doc `event-volunteer-signups.md`), so admins
reason about the two flows the same way.

> **Phase 1 scope**: the public signup page, fee calculation,
> payment instructions, and database layer are live. The
> **admin event editor toggle** and **admin vendor list page**
> are Phase 2. Until those ship, vendor signup is enabled per
> event by running a small SQL update against Supabase (see
> §3).

## 2. Defaults

- Food vendor fee: **$100** (`vendor_food_fee_cents = 10000`).
- Other vendor fee: **$50** (`vendor_other_fee_cents = 5000`).
- Payment handles (shown on the post-signup screen):
  - CashApp — `$KighTreasurer`
  - Venmo — `@KIGH_Treasurer`
  - PayPal — `@KighTreasurer`

Fees are stored per-event so a future event can run different
pricing without code changes. Handles live in
`src/lib/eventVendorSignup.ts` (`VENDOR_PAYMENT_HANDLES`) and
will move to admin settings in Phase 2.

## 3. Enable vendor signup on an event (Phase 1)

Until the admin UI ships, an elevated admin enables vendor
signup by updating the event row directly in Supabase.

```sql
update public.events
set
  vendor_signup_enabled = true,
  -- Optional: cut signups off at a specific moment.
  vendor_signup_closes_at = '2026-07-15 23:59:00-05',
  -- Optional: short instructions shown above the form (≤1000 chars).
  vendor_signup_instructions =
    'Setup begins at 8 AM. Power is available for food vendors only.',
  -- Optional: override the default fees for this event (cents).
  vendor_food_fee_cents = 10000,
  vendor_other_fee_cents = 5000
where slug = 'family-fun-day-2026';
```

Run it from the Supabase **SQL editor** or via `supabase db
execute`. Verify the change took effect by visiting the public
event page — a gold **"Sign up as a vendor"** card appears in
the right column.

To **disable** signup mid-cycle:

```sql
update public.events
set vendor_signup_enabled = false
where slug = '<event-slug>';
```

The public page will then show "Vendor signup is not open for
this event."

## 4. Shareable vendor link

Public URL shape:

`/events/<event-slug>/vendor`

Full URL uses `VITE_PUBLIC_SITE_URL` or `VITE_APP_URL` when
set (see `buildVendorSignupUrl` in
`src/lib/eventVendorSignup.ts`). A WhatsApp share helper is
available via `buildVendorWhatsAppShareUrl` and a default
message template in `buildVendorShareMessage`.

## 5. Vendor signup form

Public page: `EventVendorSignupPage` at `/events/:slug/vendor`.

Required fields:

- **Business name** (trimmed length 2–200).
- **Contact person** (trimmed length 2–120).
- **Email** (validated format).
- **Phone** (international rules; normalized before save).
- **Vendor category** (`food` or `other`).

Optional:

- **Product / service description** (≤500 characters,
  moderation-checked).

The fee for the selected category is displayed live as the
vendor toggles the dropdown, and is recomputed server-side at
insert time to prevent tampering.

## 6. Post-signup payment screen

On successful submission the vendor sees a confirmation panel
with:

- The fee amount (rendered as USD, e.g. `$100`).
- Three payment handles with **Copy** (clipboard) and **Open**
  (deep link) buttons:
  - CashApp `$KighTreasurer` → `https://cash.app/$KighTreasurer`
  - Venmo `@KIGH_Treasurer` → `https://venmo.com/KIGH_Treasurer`
  - PayPal `@KighTreasurer` →
    `https://www.paypal.com/paypalme/KighTreasurer`
- A reminder to include the business name in the payment note
  so the treasurer can match payment to signup.

Their `event_vendor_signups` row is created immediately with
`status = 'submitted'` and `payment_status = 'unpaid'`. There
is no "awaiting payment" gate on the public side; the vendor
is in the list as soon as they submit.

## 7. Reviewing signups (Phase 1)

Until the admin Vendors page ships, organizers review signups
via Supabase. Sample query:

```sql
select
  s.submitted_at,
  s.business_name,
  s.contact_name,
  s.email,
  s.phone,
  s.vendor_category,
  (s.fee_amount_cents / 100.0)::numeric(10,2) as fee_usd,
  s.payment_status,
  s.status,
  s.product_description
from public.event_vendor_signups s
join public.events e on e.id = s.event_id
where e.slug = '<event-slug>'
order by s.submitted_at desc;
```

Only elevated admins (`public.kigh_is_elevated_admin()`) can
select this table. The owning user (if signed in at submit
time) can see their own row.

## 8. Marking a payment received (Phase 1)

When the treasurer confirms funds arrived, update the row:

```sql
update public.event_vendor_signups
set
  payment_status = 'paid',
  status = 'confirmed'
where id = '<signup-uuid>';
```

Allowed `payment_status` values: `unpaid`, `paid`, `waived`,
`refunded`. Allowed `status` values: `submitted`, `confirmed`,
`waitlisted`, `cancelled`, `declined`.

If a vendor needs to be removed: set `status = 'cancelled'`
(preserves the row for audit) or delete the row outright (RLS
permits delete by elevated admins; the FK from event cascades
on event delete).

## 9. Privacy model

- Vendor **business name** and **product description** are
  considered **public**: they appear on the post-signup
  thank-you screen and will be shown on a public vendor
  directory in a future iteration. Validate them through the
  same moderation that gates community content.
- Vendor **contact name, email, and phone** are **never**
  shown publicly. They live in `event_vendor_signups` and are
  selectable only by elevated admins or the row owner.
- The public event page may show a CTA but no signup details.
- Public `public_event_vendor_signup_count(slug)` returns a
  bare integer count; no PII is reachable via this RPC.

## 10. RLS model (summary)

| Action            | Who                                                                                                |
|-------------------|----------------------------------------------------------------------------------------------------|
| Insert row        | RPC `create_event_vendor_signup` (definer); no broad anon `insert` on the table                    |
| Select            | Elevated admin, or owner where `user_id = auth.uid()`                                              |
| Update / delete   | Elevated admin                                                                                     |

Duplicate guards: a vendor cannot sign up twice for the same
event with the same phone, nor with the same email
(`event_vendor_signups_event_phone_unique` and
`event_vendor_signups_event_email_unique`).

## 11. Manual UAT steps (Supabase)

1. Apply migration `050_event_vendor_signups.sql` to the UAT
   Supabase project (SQL editor or `supabase db push`).
2. Confirm table `public.event_vendor_signups` exists and the
   new columns are on `public.events`
   (`vendor_signup_enabled`, `vendor_signup_closes_at`,
   `vendor_signup_instructions`, `vendor_food_fee_cents`,
   `vendor_other_fee_cents`, `vendor_slots_total`).
3. Verify `create_event_vendor_signup` and
   `public_event_vendor_signup_count` exist; check
   `pg_proc.proacl` (or the equivalent SQL editor view) shows
   `anon, authenticated` for `EXECUTE`.
4. Smoke-test RLS: as anon, `select` on `event_vendor_signups`
   should return zero rows; the RPC against a **published**
   event with `vendor_signup_enabled = true` should return one
   row with a UUID, fee in cents, and category.

## 12. Manual UAT steps (Vercel / app)

1. Deploy a build that includes the vendor signup feature.
2. Enable vendor signup on a **published** test event (see §3).
3. Open the event detail page — confirm the gold "Sign up as a
   vendor" card appears in the right column.
4. Submit a vendor signup (both anonymously and, if possible,
   while signed in as a member).
5. Confirm the post-signup screen shows the correct fee
   ($100 for food, $50 for other) and all three payment
   handles render with working Copy buttons.
6. Run the query in §7 to confirm the row was written and
   `fee_amount_cents` matches the displayed fee.
7. Submit the same phone or email again — expect the friendly
   duplicate-signup error message.
8. Set `vendor_signup_closes_at` to a moment in the past;
   confirm the form shows "Vendor signup closed."

## 13. Future Phase 2 work

- Admin event editor: toggle `vendor_signup_enabled`, set
  `closes_at`, edit instructions, override fees.
- Admin **Vendors** page (`/admin/vendors` or a tab on each
  event): list signups with search, filter by event/status/
  payment_status, mark-paid action, export CSV.
- Surface payment handles as admin-editable settings so the
  treasurer's handles can rotate without a deploy.
- Optional: capacity enforcement via `vendor_slots_total`
  (auto-close signup when reached).
- Optional: public vendor directory per event — opt-in by the
  vendor, showing business name + description only.

## 14. Future production duplication

When UAT is cloned to production, include migration **050** in
the production migration chain. Re-point
`VITE_PUBLIC_SITE_URL` / `VITE_APP_URL` to the production
domain so generated share links resolve correctly. Confirm the
payment handles in `src/lib/eventVendorSignup.ts` still point
to the KIGH treasurer's live accounts.
