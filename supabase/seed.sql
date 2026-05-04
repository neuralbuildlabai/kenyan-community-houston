-- ============================================================
-- ⚠️  LOCAL / DEMO SEED DATA ONLY — DO NOT RUN IN PRODUCTION ⚠️
-- ============================================================
-- This file contains FICTIONAL businesses, fundraisers, and people.
-- It exists for local development and Playwright e2e tests. Running
-- it against any production-facing Supabase project will publish
-- fake content (including fictitious named individuals) under the
-- KIGH name. That would be a launch-blocker.
--
-- Use `supabase/seed.production.example.sql` as the template for
-- bootstrapping a real production project.
-- ============================================================
-- Seed Data – Kenyan Community Houston (LOCAL/DEMO ONLY)
-- ============================================================

-- ─── Gallery Album ──────────────────────────────────────────
insert into gallery_albums (id, slug, name, description) values
  ('00000000-0000-0000-0000-000000000001', 'community-events-2024', 'Community Events 2024', 'Highlights from our 2024 gatherings'),
  ('00000000-0000-0000-0000-000000000002', 'cultural-celebrations', 'Cultural Celebrations', 'Jamhuri Day, Madaraka Day, and more')
on conflict (id) do nothing;

-- ─── Events ─────────────────────────────────────────────────
insert into events (slug, title, category, description, start_date, location, is_free, status, published_at) values
  (
    'kenyan-independence-day-gala-2025',
    'Kenyan Independence Day Gala 2025',
    'Cultural',
    'Join us as we celebrate Kenya''s Independence Day with food, music, and community. Traditional attire encouraged.',
    '2025-12-12',
    'NRG Park, Houston, TX',
    false,
    'published',
    now()
  ),
  (
    'houston-kenyan-professionals-mixer',
    'Houston Kenyan Professionals Mixer',
    'Networking',
    'Monthly networking event for Kenyan professionals in the greater Houston area. All industries welcome.',
    '2025-08-15',
    'The Westin Galleria Houston',
    true,
    'published',
    now()
  ),
  (
    'harambee-day-community-picnic',
    'Harambee Day Community Picnic',
    'Social',
    'A family-friendly outdoor picnic celebrating our community spirit. Bring your family and enjoy Kenyan food, games, and music.',
    '2025-09-06',
    'Hermann Park, Houston, TX',
    true,
    'published',
    now()
  )
on conflict (slug) do nothing;

-- ─── Announcements ──────────────────────────────────────────
insert into announcements (slug, title, category, summary, body, is_pinned, status, published_at) values
  (
    'welcome-to-the-new-community-platform',
    'Welcome to the Kenyan Community Houston Platform',
    'Community News',
    'We''re excited to launch our new digital hub for the Kenyan community in Houston.',
    'After months of planning, we are thrilled to launch this platform dedicated to connecting Kenyans across the greater Houston area. This platform will serve as your central resource for community events, business listings, announcements, and more. Stay connected and share your events and news with us!',
    true,
    'published',
    now()
  ),
  (
    'volunteer-opportunities-2025',
    'Volunteer Opportunities Available – 2025',
    'Volunteer',
    'Help build our community by volunteering with various initiatives.',
    'We are looking for passionate community members to help with event planning, social media management, mentorship programs for youth, and fundraiser coordination. If you have time to give, please reach out via our Contact page.',
    false,
    'published',
    now()
  )
on conflict (slug) do nothing;

-- ─── Businesses ─────────────────────────────────────────────
insert into businesses (slug, name, category, description, city, phone, tier, status, published_at) values
  (
    'mama-africa-catering',
    'Mama Africa Catering',
    'Food & Catering',
    'Authentic Kenyan and East African cuisine for events, parties, and corporate gatherings. Specializing in nyama choma, pilau, and mandazi.',
    'Houston',
    '(713) 555-0101',
    'featured',
    'published',
    now()
  ),
  (
    'nairobi-insurance-group',
    'Nairobi Insurance Group',
    'Insurance',
    'Life, health, auto, and home insurance for individuals and families. Kenyan-owned and community-focused.',
    'Sugar Land',
    '(281) 555-0202',
    'verified',
    'published',
    now()
  ),
  (
    'savanna-hair-salon',
    'Savanna Hair & Beauty Salon',
    'Beauty & Wellness',
    'Natural hair care, braiding, weaves, and beauty services. Specializing in African hair textures.',
    'Houston',
    '(713) 555-0303',
    'basic',
    'published',
    now()
  )
on conflict (slug) do nothing;

-- ─── Fundraisers ────────────────────────────────────────────
insert into fundraisers (slug, title, category, summary, body, beneficiary_name, goal_amount, raised_amount, verification_status, status, published_at) values
  (
    'school-fees-support-wanjiku-family',
    'School Fees Support – Wanjiku Family',
    'Education',
    'Helping cover school fees for three children whose father recently passed.',
    'The Wanjiku family lost their breadwinner in January 2025. The three children are in primary and secondary school in Kenya. Community members have rallied together to ensure they can complete their education. All funds go directly to the school accounts.',
    'Wanjiku Family',
    5000,
    2350,
    'verified',
    'published',
    now()
  ),
  (
    'medical-support-john-kamau',
    'Medical Support for John Kamau',
    'Medical',
    'John requires urgent medical treatment. Let''s come together to help.',
    'John Kamau, a beloved community member, has been diagnosed with a serious condition requiring surgery and extended care. His medical insurance does not cover the full cost. Any amount helps.',
    'John Kamau',
    8000,
    3100,
    'verified',
    'published',
    now()
  )
on conflict (slug) do nothing;
