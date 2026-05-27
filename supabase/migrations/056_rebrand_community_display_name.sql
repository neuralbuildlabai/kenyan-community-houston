-- ============================================================
-- 056 — Rebrand display name to "Kenyans in Greater Houston"
-- ============================================================
-- The `kigh` community row was seeded with:
--   name       = 'Kenyan Community Houston'
--   legal_name = 'Kenyans in Greater Houston'
--
-- The product decision (May 2026) is to lead with "Kenyans in
-- Greater Houston" as the consumer-facing brand everywhere. This
-- migration aligns the `name` column so any UI surface that reads
-- `communities.name` shows the new brand.
--
-- `legal_name` is left as-is. If the IRS 501(c)(3) filing uses a
-- different legal entity name, update it through the same row.
-- Frontend disclaimers were updated in the same PR to use the new
-- brand everywhere consumer-facing.

update public.communities
   set name = 'Kenyans in Greater Houston',
       updated_at = now()
 where slug = 'kigh'
   and name <> 'Kenyans in Greater Houston';
