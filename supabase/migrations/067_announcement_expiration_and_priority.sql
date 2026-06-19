-- Announcement expiration, featured flag, priority, and public visibility window.

alter table public.announcements
  add column if not exists expires_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists is_featured boolean not null default false,
  add column if not exists priority integer not null default 0;

comment on column public.announcements.expires_at is
  'When set, announcement is hidden from public listings after this moment.';
comment on column public.announcements.priority is
  'Higher values surface first on the homepage (after featured).';

alter table public.announcements drop constraint if exists announcements_expires_after_publish_chk;
alter table public.announcements
  add constraint announcements_expires_after_publish_chk check (
    expires_at is null
    or published_at is null
    or expires_at > published_at
  );

create index if not exists announcements_homepage_idx
  on public.announcements (status, is_featured desc, priority desc, published_at desc nulls last, created_at desc)
  where status = 'published';

-- Public reads only active published announcements (not expired).
drop policy if exists "Public can read published announcements" on public.announcements;
create policy "Public can read published announcements"
  on public.announcements
  for select
  to anon, authenticated
  using (
    status = 'published'
    and (expires_at is null or expires_at >= now())
  );
