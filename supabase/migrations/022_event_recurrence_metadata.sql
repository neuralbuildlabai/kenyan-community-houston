-- ============================================================
-- 022 — Event recurrence metadata + announcement calendar recurrence
-- ============================================================
-- Adds structured recurrence fields for generated occurrence rows,
-- optional announcement-side recurrence intent, indexes, and a
-- conservative backfill for slug patterns ending in -YYYY-MM-DD.

-- ─── announcements: recurrence intent (submission / approval) ─
alter table public.announcements
  add column if not exists calendar_is_recurring boolean not null default false,
  add column if not exists calendar_recurrence_frequency text,
  add column if not exists calendar_recurrence_until date,
  add column if not exists calendar_recurrence_count integer;

comment on column public.announcements.calendar_is_recurring is 'When true with include_in_calendar, approval generates a weekly series (see calendar_recurrence_*).';
comment on column public.announcements.calendar_recurrence_frequency is 'Optional: daily | weekly | monthly | yearly (product currently uses weekly).';

alter table public.announcements drop constraint if exists announcements_calendar_recurrence_frequency_chk;
alter table public.announcements
  add constraint announcements_calendar_recurrence_frequency_chk
  check (
    calendar_recurrence_frequency is null
    or calendar_recurrence_frequency in ('daily', 'weekly', 'monthly', 'yearly')
  );

-- ─── events: recurrence columns ───────────────────────────────
alter table public.events
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_group_id uuid,
  add column if not exists recurrence_master_id uuid,
  add column if not exists recurrence_frequency text,
  add column if not exists recurrence_interval integer not null default 1,
  add column if not exists recurrence_until date,
  add column if not exists source_announcement_id uuid,
  add column if not exists recurrence_position integer;

comment on column public.events.is_recurring is 'True when this row is part of a generated recurrence series.';
comment on column public.events.recurrence_group_id is 'Stable id shared by all occurrences in the same series.';
comment on column public.events.recurrence_master_id is 'Canonical series row (usually earliest); detail/links.';
comment on column public.events.source_announcement_id is 'Announcement that generated this occurrence (if any).';

alter table public.events drop constraint if exists events_recurrence_frequency_chk;
alter table public.events
  add constraint events_recurrence_frequency_chk
  check (
    recurrence_frequency is null
    or recurrence_frequency in ('daily', 'weekly', 'monthly', 'yearly')
  );

alter table public.events drop constraint if exists events_recurrence_interval_chk;
alter table public.events
  add constraint events_recurrence_interval_chk
  check (recurrence_interval > 0);

alter table public.events drop constraint if exists events_recurrence_master_id_fkey;
alter table public.events
  add constraint events_recurrence_master_id_fkey
  foreign key (recurrence_master_id) references public.events (id) on delete set null;

alter table public.events drop constraint if exists events_source_announcement_id_fkey;
alter table public.events
  add constraint events_source_announcement_id_fkey
  foreign key (source_announcement_id) references public.announcements (id) on delete set null;

create index if not exists events_recurrence_group_idx on public.events (recurrence_group_id);
create index if not exists events_source_announcement_idx on public.events (source_announcement_id);

-- Composite for public queries (published upcoming / recurrence grouping)
create index if not exists events_status_start_date_idx on public.events (status, start_date);
create index if not exists events_public_recurrence_idx on public.events (status, start_date, recurrence_group_id);

-- One logical occurrence per series per local date (+ time distinguishes rare edge cases)
create unique index if not exists events_recurrence_group_date_time_unique
  on public.events (recurrence_group_id, start_date, coalesce(start_time::text, ''))
  where recurrence_group_id is not null;

-- ─── Conservative backfill: ISO date suffix stems with count > 1 ─
do $$
declare
  r record;
  v_gid uuid;
  v_master uuid;
begin
  for r in
    with stems as (
      select
        substring(slug from '^(.*)-\d{4}-\d{2}-\d{2}$') as stem,
        count(*)::int as cnt
      from public.events
      where slug ~ '-\d{4}-\d{2}-\d{2}$'
      group by 1
      having count(*) > 1 and substring(slug from '^(.*)-\d{4}-\d{2}-\d{2}$') is not null
    )
    select stem from stems
  loop
    v_gid := gen_random_uuid();

    update public.events e set
      is_recurring = true,
      recurrence_group_id = v_gid,
      recurrence_frequency = 'weekly',
      recurrence_interval = 1,
      recurrence_until = sub.mx_date,
      recurrence_position = sub.rn
    from (
      select
        e2.id,
        row_number() over (order by e2.start_date asc, e2.start_time asc nulls last) as rn,
        max(e2.start_date) over () as mx_date
      from public.events e2
      where substring(e2.slug from '^(.*)-\d{4}-\d{2}-\d{2}$') = r.stem
    ) sub
    where e.id = sub.id;

    select e.id into v_master
    from public.events e
    where e.recurrence_group_id = v_gid
    order by e.start_date asc, e.start_time asc nulls last
    limit 1;

    if v_master is not null then
      update public.events set recurrence_master_id = v_master
      where recurrence_group_id = v_gid and id <> v_master;

      update public.events set recurrence_master_id = null
      where id = v_master;
    end if;
  end loop;
end $$;
