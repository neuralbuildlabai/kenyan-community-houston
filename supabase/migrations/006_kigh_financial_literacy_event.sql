-- ============================================================
-- KIGH Financial Literacy Session (Apr 24, 2026) — single public
-- past event for that evening. All session materials (Financial
-- Literacy, HR/Benefits, Tax PDF) link here — no separate calendar
-- rows per deck. Idempotent on events.slug + resource slugs.
-- Archives legacy tax-presentation-04-24-2026 event if present.
-- ============================================================

INSERT INTO events (
  slug,
  title,
  category,
  description,
  short_description,
  start_date,
  end_date,
  start_time,
  end_time,
  timezone,
  location,
  address,
  city,
  state,
  is_virtual,
  is_free,
  status,
  published_at,
  is_featured,
  image_url,
  flyer_url,
  organizer_name,
  organizer_email
) VALUES (
  'kigh-financial-literacy-session-2026-04-24',
  'KIGH Financial Literacy Session',
  'Education',
  $fl$Kenyans in Greater Houston hosted a Financial Literacy Session covering budgeting basics, life insurance, passive income opportunities including Airbnb, deductions and benefits, and deductions and taxes. The session featured speakers Betty Achapa, George Onami, Joyce Marendes, and Ernest Mbalanya.$fl$,
  'A KIGH financial literacy session focused on practical ways to grow, manage, and protect money.',
  '2026-04-24',
  null,
  '19:00:00',
  null,
  'America/Chicago',
  'Online / Zoom',
  null,
  'Houston',
  'TX',
  true,
  true,
  'published',
  now(),
  false,
  '/kigh-media/events/kigh-financial-literacy-session-2026.jpeg',
  '/kigh-media/events/kigh-financial-literacy-session-2026.jpeg',
  'Kenyans in Greater Houston / KIGH',
  null
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  timezone = EXCLUDED.timezone,
  location = EXCLUDED.location,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  is_virtual = EXCLUDED.is_virtual,
  is_free = EXCLUDED.is_free,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at,
  is_featured = EXCLUDED.is_featured,
  image_url = EXCLUDED.image_url,
  flyer_url = EXCLUDED.flyer_url,
  organizer_name = EXCLUDED.organizer_name,
  organizer_email = EXCLUDED.organizer_email,
  updated_at = now();

-- Legacy duplicate for the same evening: same date as the consolidated session.
-- Keep row for history; hide from public calendar (published-only queries).
UPDATE events
SET
  status = 'archived',
  updated_at = now()
WHERE slug = 'tax-presentation-04-24-2026'
  AND status IS DISTINCT FROM 'archived';

-- All three public decks from the same session (no separate events).
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
