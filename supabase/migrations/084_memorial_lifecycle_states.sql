-- ============================================================
-- 084 — Memorial lifecycle states (admin archive after a funeral)
-- ============================================================
-- Memorial content stays in code (src/lib/memorials.ts): the prose is
-- bespoke per family and the asset paths — funeral program PDF, three QR
-- images, the permanent URL — are baked into printed flyers. What admins
-- were missing is lifecycle control: after the funeral, a memorial should
-- stop being promoted on /memorials without anyone shipping a deploy.
--
-- So this table is an overlay keyed by the registry slug, holding only
-- lifecycle state. Same shape as leadership_seats (migration 045), which
-- overlays the static roster in src/data/leadership.ts.
--
-- Two invariants the schema and the app both respect:
--
--   1. A MISSING ROW MEANS ACTIVE. A memorial added to the code registry
--      needs no database write to appear, and a lost/absent row can never
--      hide someone. The app normalises unknown values to 'active' too.
--
--   2. ARCHIVING NEVER BREAKS A URL. Printed QR codes point at
--      /memorials/<slug> forever. Archiving only removes a memorial from
--      the promoted list on the index; the page itself always renders.
--      Nothing here is allowed to gate routing or return a 404.

create table if not exists public.memorial_states (
  slug        text primary key,
  status      text not null default 'active',
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete set null,
  admin_notes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint memorial_states_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint memorial_states_status_chk check (status in ('active', 'archived')),
  constraint memorial_states_notes_len check (admin_notes is null or char_length(admin_notes) <= 500),
  -- An archived row always records when it happened; an active row carries
  -- no stale archive timestamp. Keeps the admin table honest.
  constraint memorial_states_archived_at_chk check (
    (status = 'archived' and archived_at is not null)
    or (status = 'active' and archived_at is null)
  )
);

comment on table public.memorial_states is
  'Lifecycle overlay for the code-defined memorial registry (src/lib/memorials.ts). One row per slug; a missing row means active. Archiving hides a memorial from the promoted list on /memorials but never affects routing — printed QR codes depend on those URLs resolving forever. See migration 084.';
comment on column public.memorial_states.slug is
  'Matches MemorialEntry.slug in src/lib/memorials.ts and the public path /memorials/<slug>.';
comment on column public.memorial_states.status is
  'active = promoted on /memorials. archived = service has taken place; listed quietly, page still reachable.';
comment on column public.memorial_states.archived_by is
  'Admin who archived the memorial. Null when active or when the account was later removed.';

create index if not exists memorial_states_status_idx
  on public.memorial_states (status);

drop trigger if exists memorial_states_updated_at on public.memorial_states;
create trigger memorial_states_updated_at
  before update on public.memorial_states
  for each row execute function public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────
-- Public read: the index page partitions promoted vs archived in the
-- browser, so anon needs to see the state. The row holds no personal
-- data beyond the archiving admin's id, which stays admin-only below.
alter table public.memorial_states enable row level security;

drop policy if exists "memorial_states public select" on public.memorial_states;
create policy "memorial_states public select"
  on public.memorial_states for select
  to anon, authenticated
  using (true);

drop policy if exists "memorial_states elevated admin write" on public.memorial_states;
create policy "memorial_states elevated admin write"
  on public.memorial_states for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── Grants ─────────────────────────────────────────────────
-- Anonymous visitors get a column grant, not a table grant: the index page
-- needs slug + status to partition the list, while `archived_by` and
-- `admin_notes` stay internal. A table-wide grant would cover every column
-- and cannot be narrowed by a later column-level revoke (see migration 077).
revoke select on public.memorial_states from anon;
revoke select on public.memorial_states from public;

grant select (slug, status, archived_at) on public.memorial_states to anon;
grant select on public.memorial_states to authenticated;
grant insert, update, delete on public.memorial_states to authenticated;
grant select, insert, update, delete on public.memorial_states to service_role;
