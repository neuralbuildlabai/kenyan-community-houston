-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
alter table events               enable row level security;
alter table announcements        enable row level security;
alter table businesses           enable row level security;
alter table fundraisers          enable row level security;
alter table sports_posts         enable row level security;
alter table gallery_albums       enable row level security;
alter table gallery_images       enable row level security;
alter table contact_submissions  enable row level security;

-- ─── Helper: is_admin ───────────────────────────────────────
-- Returns true if the current session user is an authenticated Supabase user.
-- For this platform, any authenticated user = admin.
create or replace function is_admin()
returns boolean language plpgsql security definer as $$
begin
  return auth.uid() is not null;
end;
$$;

-- ─── EVENTS ─────────────────────────────────────────────────
-- Public: read published events
create policy "Public can read published events"
  on events for select
  using (status = 'published');

-- Anon insert (submission form)
create policy "Anyone can submit events"
  on events for insert
  with check (status = 'pending');

-- Admin: full access
create policy "Admins have full access to events"
  on events for all
  using (is_admin())
  with check (is_admin());

-- ─── ANNOUNCEMENTS ──────────────────────────────────────────
create policy "Public can read published announcements"
  on announcements for select
  using (status = 'published');

create policy "Anyone can submit announcements"
  on announcements for insert
  with check (status = 'pending');

create policy "Admins have full access to announcements"
  on announcements for all
  using (is_admin())
  with check (is_admin());

-- ─── BUSINESSES ─────────────────────────────────────────────
create policy "Public can read published businesses"
  on businesses for select
  using (status = 'published');

create policy "Anyone can submit businesses"
  on businesses for insert
  with check (status = 'pending');

create policy "Admins have full access to businesses"
  on businesses for all
  using (is_admin())
  with check (is_admin());

-- ─── FUNDRAISERS ────────────────────────────────────────────
create policy "Public can read published fundraisers"
  on fundraisers for select
  using (status = 'published');

create policy "Anyone can submit fundraisers"
  on fundraisers for insert
  with check (status = 'pending');

create policy "Admins have full access to fundraisers"
  on fundraisers for all
  using (is_admin())
  with check (is_admin());

-- ─── SPORTS POSTS ───────────────────────────────────────────
create policy "Public can read published sports posts"
  on sports_posts for select
  using (status = 'published');

create policy "Admins have full access to sports posts"
  on sports_posts for all
  using (is_admin())
  with check (is_admin());

-- ─── GALLERY ALBUMS ─────────────────────────────────────────
create policy "Public can read gallery albums"
  on gallery_albums for select
  using (true);

create policy "Admins manage gallery albums"
  on gallery_albums for all
  using (is_admin())
  with check (is_admin());

-- ─── GALLERY IMAGES ─────────────────────────────────────────
create policy "Public can read published gallery images"
  on gallery_images for select
  using (status = 'published');

create policy "Admins manage gallery images"
  on gallery_images for all
  using (is_admin())
  with check (is_admin());

-- ─── CONTACT SUBMISSIONS ────────────────────────────────────
-- Anyone can insert (contact form)
create policy "Anyone can submit contact forms"
  on contact_submissions for insert
  with check (true);

-- Only admins can read
create policy "Admins can read contacts"
  on contact_submissions for select
  using (is_admin());

create policy "Admins can manage contacts"
  on contact_submissions for all
  using (is_admin())
  with check (is_admin());
