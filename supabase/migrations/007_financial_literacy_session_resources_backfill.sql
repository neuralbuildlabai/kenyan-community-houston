-- ============================================================
-- Backfill: Apr 24 Financial Literacy session resources
-- Safe if 006 already set related_event_id + resource_date.
-- For DBs that ran an older 006 without resource_date updates.
-- ============================================================

UPDATE events
SET
  status = 'archived',
  updated_at = now()
WHERE slug = 'tax-presentation-04-24-2026'
  AND status IS DISTINCT FROM 'archived';

UPDATE resources r
SET
  related_event_id = e.id,
  resource_date = '2026-04-24'::date,
  updated_at = now()
FROM events e
WHERE e.slug = 'kigh-financial-literacy-session-2026-04-24'
  AND r.slug IN (
    'kigh-financial-literacy',
    'tax-presentation-04-24-2026',
    'hr-benefits-joyce-marendes'
  )
  AND (
    r.related_event_id IS DISTINCT FROM e.id
    OR r.resource_date IS DISTINCT FROM '2026-04-24'::date
  );
