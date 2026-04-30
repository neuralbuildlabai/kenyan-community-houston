-- ============================================================
-- Kenyan Community Houston – Initial Schema
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- for text search

-- ─── ENUM types ─────────────────────────────────────────────
create type content_status as enum (
  'draft', 'pending', 'published', 'unpublished', 'archived', 'rejected'
);

create type verification_status as enum (
  'unverified', 'under_review', 'verified', 'flagged'
);

create type business_tier as enum (
  'basic', 'verified', 'featured', 'sponsor'
);

create type contact_type as enum (
  'general', 'event_submission', 'business_inquiry', 'fundraiser', 'other'
);

-- ─── EVENTS ─────────────────────────────────────────────────
create table events (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title             text not null,
  category          text not null,
  description       text,
  start_date        date not null,
  end_date          date,
  start_time        time,
  end_time          time,
  location          text not null,
  address           text,
  is_free           boolean not null default true,
  ticket_price      numeric(10,2),
  ticket_url        text,
  flyer_url         text,
  organizer_name    text,
  organizer_contact text,
  organizer_website text,
  tags              text[] default '{}',
  status            content_status not null default 'pending',
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index events_status_idx on events(status);
create index events_start_date_idx on events(start_date);
create index events_category_idx on events(category);
create index events_slug_idx on events(slug);

-- ─── ANNOUNCEMENTS ──────────────────────────────────────────
create table announcements (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  category     text not null,
  summary      text,
  body         text,
  image_url    text,
  author_name  text,
  external_url text,
  is_pinned    boolean not null default false,
  status       content_status not null default 'pending',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index announcements_status_idx on announcements(status);
create index announcements_is_pinned_idx on announcements(is_pinned);
create index announcements_published_at_idx on announcements(published_at desc);

-- ─── BUSINESSES ─────────────────────────────────────────────
create table businesses (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  category      text not null,
  description   text,
  services      text,
  logo_url      text,
  address       text,
  city          text default 'Houston',
  state         text default 'TX',
  zip           text,
  phone         text,
  email         text,
  website       text,
  instagram     text,
  facebook      text,
  owner_name    text,
  owner_contact text,
  tier          business_tier not null default 'basic',
  status        content_status not null default 'pending',
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index businesses_status_idx on businesses(status);
create index businesses_category_idx on businesses(category);
create index businesses_tier_idx on businesses(tier);

-- ─── FUNDRAISERS ────────────────────────────────────────────
create table fundraisers (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  title               text not null,
  category            text not null,
  summary             text,
  body                text,
  image_url           text,
  beneficiary_name    text not null,
  organizer_name      text,
  organizer_contact   text,
  goal_amount         numeric(12,2),
  raised_amount       numeric(12,2) not null default 0,
  donation_url        text,
  deadline            date,
  verification_status verification_status not null default 'unverified',
  status              content_status not null default 'pending',
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index fundraisers_status_idx on fundraisers(status);
create index fundraisers_verification_idx on fundraisers(verification_status);
create index fundraisers_published_at_idx on fundraisers(published_at desc);

-- ─── SPORTS / YOUTH ─────────────────────────────────────────
create table sports_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  category     text not null,
  summary      text,
  body         text,
  image_url    text,
  author_name  text,
  external_url text,
  status       content_status not null default 'pending',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index sports_posts_status_idx on sports_posts(status);
create index sports_posts_published_at_idx on sports_posts(published_at desc);

-- ─── GALLERY ────────────────────────────────────────────────
create table gallery_albums (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  cover_url   text,
  created_at  timestamptz not null default now()
);

create table gallery_images (
  id         uuid primary key default gen_random_uuid(),
  album_id   uuid references gallery_albums(id) on delete set null,
  image_url  text not null,
  caption    text,
  taken_at   date,
  status     content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index gallery_images_album_idx on gallery_images(album_id);
create index gallery_images_status_idx on gallery_images(status);

-- ─── CONTACT SUBMISSIONS ────────────────────────────────────
create table contact_submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  type       contact_type not null default 'general',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_submissions_is_read_idx on contact_submissions(is_read);
create index contact_submissions_created_at_idx on contact_submissions(created_at desc);

-- ─── ADMIN USERS VIEW ───────────────────────────────────────
-- Provides a safe, queryable view of auth.users for admin pages
create or replace view admin_users as
  select
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at,
    last_sign_in_at
  from auth.users;

-- ─── Updated_at trigger ─────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at before update on events
  for each row execute procedure set_updated_at();
create trigger announcements_updated_at before update on announcements
  for each row execute procedure set_updated_at();
create trigger businesses_updated_at before update on businesses
  for each row execute procedure set_updated_at();
create trigger fundraisers_updated_at before update on fundraisers
  for each row execute procedure set_updated_at();
create trigger sports_posts_updated_at before update on sports_posts
  for each row execute procedure set_updated_at();
