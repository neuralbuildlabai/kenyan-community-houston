-- ============================================================
-- Seed: KIGH Family Fun Day (upcoming) + Tax Presentation (past)
-- Idempotent on events.slug. Links tax resource to tax event.
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
  'kigh-family-fun-day-2026',
  'KIGH Family Fun Day',
  'Community',
  $fd$KIGH Family Fun Day is still on. Join Kenyans in Greater Houston for a family-friendly community celebration at Cullen Park, Pavilions A1 and A2. Everything is planned as scheduled, including live DJs DJ Ericko and DJ Sasabasi, food and merchandise vendors, bounce houses, face painting, and games for all ages. Bring your children, family, and friends for good vibes, great company, and unforgettable memories. Karibuni nyote.$fd$,
  'A family-friendly KIGH community celebration with live DJs, vendors, bounce houses, face painting, games, food, merchandise, and activities for all ages.',
  '2026-05-02',
  '2026-05-02',
  '12:00:00',
  '19:00:00',
  'America/Chicago',
  'Cullen Park, Pavilions A1 & A2',
  'Houston, TX 77084',
  'Houston',
  'TX',
  false,
  true,
  'published',
  now(),
  true,
  '/kigh-media/events/kigh-family-fun-day-2026.jpeg',
  '/kigh-media/events/kigh-family-fun-day-2026.jpeg',
  'Kenyans in Greater Houston / KIGH',
  null
),
(
  'tax-presentation-04-24-2026',
  'Tax Presentation 04-24-2026',
  'Education',
  $tx$Public KIGH tax presentation session held for the community. Slides and reference materials are available in the resource library as the published PDF.$tx$,
  'Community tax education session; date confirmed April 24, 2026. See resource library for the presentation file.',
  '2026-04-24',
  null,
  null,
  null,
  'America/Chicago',
  'KIGH community program — Greater Houston',
  null,
  'Houston',
  'TX',
  false,
  true,
  'published',
  now(),
  false,
  null,
  null,
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

UPDATE resources r
SET
  related_event_id = e.id,
  updated_at = now()
FROM events e
WHERE e.slug = 'tax-presentation-04-24-2026'
  AND r.slug = 'tax-presentation-04-24-2026'
  AND (r.related_event_id IS DISTINCT FROM e.id);
