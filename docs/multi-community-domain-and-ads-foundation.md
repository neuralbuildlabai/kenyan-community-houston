# Multi-Community / Domain Foundation + Local Ads — Design Notes

This document explains the tenancy model introduced by migrations
014 and 017, what is wired today, and what should land in follow-up
PRs to fully scope every legacy table.

The goal stated by the platform owner: KIGH is the first community
on a platform that may host multiple community organisations later,
each with its own primary domain, content, members, events, ads,
businesses, gallery, resources, fundraisers, and admins. We are
building the foundation now — not full enterprise multi-tenancy.

---

## Data model

```
                +---------------------+
                | communities         |
                |  id (uuid PK)       |
                |  slug, name         |
                |  primary_domain     |
                |  status, timezone   |
                +-----+---------+-----+
                      |         |
                      |         +-----------------+
                      |                            \
                      v                             v
   +-----------------------+      +-------------------------+
   | community_domains     |      | community_admin_roles   |
   |  community_id (FK)    |      |  community_id (FK)      |
   |  domain (unique)      |      |  user_id (FK auth.users)|
   |  status, verified_at  |      |  role, status           |
   +-----------------------+      +-------------------------+

                      v
   +-----------------------------------+
   | community_governance_settings     |
   |  community_id PK                  |
   |  agm_month (default 11)           |
   |  quorum_percent (default 25)      |
   +-----------------------------------+
```

The default KIGH community is created with slug `kigh` in 014. Helper
function `public.kigh_default_community_id()` returns its id, used as
the default value for every new `community_id` column on the legacy
public/admin tables.

### Roles

`community_admin_roles.role` accepts:

- `super_admin` — community-level super admin
- `community_admin`
- `admin`
- `content_manager`
- `membership_manager`
- `treasurer`
- `media_moderator`
- `ads_manager`

Platform-level super admin still comes from `profiles.role =
'super_admin'`. The helper `public.kigh_has_community_role(roles[],
community_id)` short-circuits to true for platform super admins so
the check is uniform.

### Backward compatibility

`profiles.role` continues to be the source-of-truth role for legacy
admins (board, etc.). The new `community_admin_roles` table does NOT
replace `profiles.role`; it augments it. `kigh_is_elevated_admin()`
still inspects only `profiles.role` — that is intentional, so all
existing RLS policies keep working without rewrites.

When we are ready to fully migrate to the new model, the steps are:

1. For each existing row in `profiles` whose role is in the elevated
   set, copy the user into `community_admin_roles` with
   `community_id = kigh_default_community_id()`.
2. Update `kigh_is_elevated_admin()` to consult both tables.
3. Eventually deprecate `profiles.role` for admin gating.

---

## Per-table tenant scoping

Migration 014 adds nullable `community_id` columns + indexes on:

`events`, `announcements`, `businesses`, `fundraisers`,
`sports_posts`, `gallery_albums`, `gallery_images`,
`contact_submissions`, `members`, `household_members`,
`membership_payments`, `resources`, `community_groups`,
`service_interests`, `profiles`.

Each column defaults to `kigh_default_community_id()`, so writes that
omit the field continue to work exactly as before.

What is **not** done in 014 (deliberately):

- We did **not** add `community_id` to existing RLS predicates. Doing
  that across every public table in one PR is too risky for the
  3-day production-readiness window. Instead, we:
  - added the column,
  - added the index,
  - backfilled,
  - documented the next step.
- Future work: each "Public can read published X" policy should add
  `and community_id = (select id from communities where status='active'
   and primary_domain = current_request_host())` or similar — only
  after we have a host-resolution helper that the frontend can pass
  to PostgREST.
- Until that lands, RLS treats KIGH as the only community even when
  data has `community_id` set to another community. That is safe (no
  data leak), just not multi-tenant in the strict sense.

---

## Ads / sponsorship (`community_ads`)

Migration 017 adds the ads model.

Placements (enum):

- `homepage_hero`
- `homepage_sidebar`
- `events_sidebar`
- `business_directory`
- `footer`
- `gallery_sidebar`

Status workflow: `draft → pending_review → approved → archived`
(or `rejected`).

Public visibility predicate (RLS): `status = 'approved' AND
(starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR
ends_at >= now())`. Only `super_admin`, `community_admin`, `admin`,
or `ads_manager` can insert/update/delete (scoped to the ad's
community via `kigh_has_community_role`).

Public listing helper:

```sql
select * from public.list_active_community_ads(
  'homepage_hero',
  public.kigh_default_community_id(),
  10
);
```

Frontend integration is not wired in this run — the table and RPC
are ready. To render ads:

```ts
const { data: ads } = await supabase.rpc('list_active_community_ads', {
  p_placement: 'homepage_hero',
  p_community_id: null,   // or a specific community
  p_limit: 5,
})
```

Click and impression counters live on the `community_ads` row but
have no auto-increment trigger; track via an Edge Function or the
admin UI when shipping.

---

## Governance (AGM / quorum / good-standing)

`community_governance_settings.agm_month` defaults to `11` (November).
`community_governance_settings.quorum_percent` defaults to `25`.

`public.kigh_agm_quorum_required(community_id)` returns:

| Column | Type | Meaning |
|---|---|---|
| `community_id` | uuid | The community |
| `total_members_in_good_standing` | bigint | From `members_in_good_standing` view |
| `quorum_percent` | numeric | From governance settings |
| `quorum_required` | int | `ceil(total * quorum_percent / 100)` |

Membership in good standing is determined by:

- `members.membership_status = 'active'`
- `members.good_standing = true`
- `members.membership_expires_at >= current_date` (or null)

Admins (`membership_manager` / `community_admin` / `super_admin`)
update those flags from the admin members page (or via the
forthcoming admin RPC). The Governance public page should call
`kigh_agm_quorum_required` for live numbers.

---

## What is left to ship for full multi-community

- Per-table RLS predicates referencing `community_id` (above).
- A community resolver in the frontend (e.g. read host header on
  request, look up `community_domains.domain`, store the resolved
  `community_id` in app state and use it in queries).
- Per-community admin UI (currently the admin pages assume a single
  community).
- Storage namespacing per community (e.g.
  `kigh-private-documents` becomes `private-documents/<community>/...`).
- Per-community email templates, CSS theme overrides, and brand
  assets.

None of these are launch-blockers for the KIGH-only production
release. They are the path to a true multi-tenant platform once the
operating model is validated.
