-- Family Fun Day 2026: flyer asset, June 13 schedule, Pavilion D1/D2.
-- Idempotent UPDATE for environments that already applied 005.

UPDATE events
SET
  start_date = '2026-06-13',
  end_date = '2026-06-13',
  start_time = '13:00:00',
  end_time = '20:00:00',
  timezone = 'America/Chicago',
  location = 'Pavilion D1/D2, Cullen Park',
  address = 'Houston, TX 77084',
  description = $fd$KIGH Family Fun Day — join Kenyans in Greater Houston for a family-friendly community celebration at Cullen Park, Pavilion D1/D2. Live DJs DJ Ericko and DJ Sasabasi, food and merchandise vendors, bounce houses, face painting, and games for all ages. Bring your children, family, and friends for good vibes, great company, and unforgettable memories. Karibuni nyote.$fd$,
  image_url = '/kigh-media/events/family-fun-day-2026.jpeg',
  flyer_url = '/kigh-media/events/family-fun-day-2026.jpeg',
  updated_at = now()
WHERE slug = 'kigh-family-fun-day-2026';
