-- ============================================================
-- 059 — Add vendor instructions for KIGH Family Fun Day 2026
-- ============================================================
-- Venue logistics that vendors need to know up front, surfaced
-- on the public vendor signup page via the existing
-- `events.vendor_signup_instructions` field (migration 050).
--
-- Note: this only updates the row if the slug exists and the
-- instructions field is empty/null OR matches a previous default,
-- so admin edits made in the UI between deploys are preserved.
-- ============================================================

update public.events
   set vendor_signup_instructions =
         'Power: there are no outlets at the venue. KIGH will provide a generator at a central point — vendors who need power should bring long extension cords (50ft+ recommended) to reach their booth. Bring your own tent/canopy, tables, chairs, and small change for cash sales.',
       updated_at = now()
 where slug = 'kigh-family-fun-day-2026'
   and (
     vendor_signup_instructions is null
     or trim(vendor_signup_instructions) = ''
   );
