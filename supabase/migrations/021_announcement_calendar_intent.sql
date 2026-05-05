-- Optional calendar linkage for announcements (public submissions + admin approval).
-- When include_in_calendar is true and calendar fields are complete, approving
-- publishes a matching row in public.events and stores linked_event_id.

alter table public.announcements
  add column if not exists include_in_calendar boolean not null default false,
  add column if not exists linked_event_id uuid references public.events(id) on delete set null,
  add column if not exists calendar_start_date date,
  add column if not exists calendar_end_date date,
  add column if not exists calendar_start_time text,
  add column if not exists calendar_end_time text,
  add column if not exists calendar_location text,
  add column if not exists calendar_address text,
  add column if not exists calendar_flyer_url text,
  add column if not exists calendar_registration_url text;

comment on column public.announcements.include_in_calendar is 'When true, approval may publish a matching calendar event.';
comment on column public.announcements.linked_event_id is 'events.id published from this announcement (if any).';

create index if not exists announcements_linked_event_id_idx on public.announcements(linked_event_id);
