-- ============================================================
-- supabase/seed.production.example.sql
-- ============================================================
-- This is the SAFE production bootstrap template. It is **not**
-- run automatically by `supabase db reset` or any deploy step.
-- Apply it manually, once, after the production Supabase project
-- has been provisioned and all numbered migrations have been
-- applied successfully.
--
-- What this file does:
--   1. Asserts the default KIGH community exists (idempotent).
--   2. Asserts AGM/quorum governance settings (Nov, 25%) exist.
--   3. Stops there. NO fake people, NO fake events, NO fake
--      fundraisers, NO fake businesses.
--
-- What this file deliberately does NOT do:
--   - Insert demo events, businesses, fundraisers, or members.
--   - Create any auth user. (Use Supabase Dashboard or the
--     `create-admin-user` Edge Function for the first super
--     admin, then force-rotate the password on first login.)
--   - Toggle any storage bucket to public.
--
-- ⚠️  Never copy `supabase/seed.sql` into production. It contains
-- fictional content used only for local development and tests.
-- ============================================================

-- 1. Default KIGH community.
insert into public.communities (
  slug, name, legal_name, primary_domain, status, timezone, contact_email
) values (
  'kigh',
  'Kenyan Community Houston',
  'Kenyans in Greater Houston',
  'kenyancommunityhouston.org',
  'active',
  'America/Chicago',
  'info@kenyancommunityhouston.com'
)
on conflict (slug) do update set
  name = excluded.name,
  legal_name = excluded.legal_name,
  primary_domain = excluded.primary_domain,
  status = excluded.status,
  timezone = excluded.timezone,
  contact_email = excluded.contact_email,
  updated_at = now();

-- 2. KIGH primary domain entry.
insert into public.community_domains (
  community_id, domain, is_primary, status, verified_at
)
select id, 'kenyancommunityhouston.org', true, 'verified', now()
from public.communities
where slug = 'kigh'
on conflict (domain) do update set
  community_id = excluded.community_id,
  is_primary = excluded.is_primary,
  status = excluded.status,
  verified_at = coalesce(community_domains.verified_at, excluded.verified_at),
  updated_at = now();

-- 3. KIGH governance settings (AGM in November, quorum 25%).
insert into public.community_governance_settings (
  community_id, agm_month, quorum_percent, good_standing_grace_days
)
select id, 11, 25, 30
from public.communities
where slug = 'kigh'
on conflict (community_id) do update set
  agm_month = excluded.agm_month,
  quorum_percent = excluded.quorum_percent,
  good_standing_grace_days = excluded.good_standing_grace_days,
  updated_at = now();

-- 4. (Optional) Public governance resources.
-- The KIGH constitution / bylaws / rules / roles are seeded by the
-- migration in 004_kigh_hub.sql with `access_level='public'` and
-- `status='published'`. Confirm these are the materials you want
-- live on production day-1 before flipping DNS. Otherwise mark
-- them `archived` here, e.g.:
--   update public.resources set status='archived' where slug in ('...');

-- ─────────────────────────────────────────────────────────────
-- 5. Migrations 005 / 006 / 007 — seasonal events.
--    Migrations 005, 006, and 007 publish concrete KIGH events
--    (Family Fun Day 2026-05-02 and Financial Literacy Session
--    2026-04-24) and back-fill resource links. They run by
--    default when `supabase db push` applies the chain. For a
--    fresh production project two safe options exist:
--
--      a) If those events are part of the day-1 calendar, leave
--         them as-is and confirm the rendered times/dates on the
--         public calendar before DNS flip.
--      b) If the production calendar should start empty, archive
--         the inserted rows after `db push`:
--
--           update public.events set status='archived'
--           where slug in (
--             'kigh-family-fun-day-2026',
--             'kigh-financial-literacy-session-2026-04-24'
--           );
--
--    Document the choice in the cutover ticket. Do not delete the
--    migrations; staging has already applied them, and rewriting
--    history will diverge the chains.
-- ─────────────────────────────────────────────────────────────
