-- ============================================================
-- 046 — Community polls
-- ============================================================
-- Adds a lightweight polls feature so admins can ask the community a
-- question and surface a single "featured" poll on the public landing
-- page. Signed-in members get one vote per poll; results become
-- visible to a voter only after they've cast their own vote.
--
-- Tables
--   * polls          — one row per poll question
--   * poll_options   — choices belonging to a poll
--   * poll_votes     — one row per (poll, user); uniqueness enforced
--
-- Permissions
--   * SELECT polls / options: anon + authenticated when poll is_active.
--   * INSERT / UPDATE / DELETE polls / options: elevated admins only.
--   * INSERT poll_votes: any authenticated user casting their own vote
--     in an active poll that hasn't passed its close time.
--   * SELECT poll_votes: voter sees their own row; admins see all.
--   * UPDATE / DELETE poll_votes: nobody (no policy = denied). Votes
--     are final once cast.
--
-- Results visibility
--   * kigh_poll_results(p_poll_id) is SECURITY DEFINER and only returns
--     per-option counts when the caller (a) has voted in the poll,
--     (b) is an elevated admin, or (c) the poll's closes_at is past.
--   * kigh_my_poll_vote(p_poll_id) returns the option_id the caller
--     voted for, or null. Cheap "have I voted?" check.
-- ============================================================

-- ─── 1. polls table ────────────────────────────────────────
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  question text not null,
  description text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint polls_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  constraint polls_question_len check (char_length(trim(question)) between 3 and 240),
  constraint polls_description_len check (description is null or char_length(description) <= 1000)
);

comment on table public.polls is
  'Community polls. Admin-authored; one is_featured + is_active poll renders on the landing page. See migration 046.';
comment on column public.polls.is_featured is
  'When true (and is_active), this poll is eligible to render in the landing page widget. The fetcher picks the most recently created featured + active poll.';
comment on column public.polls.closes_at is
  'Optional close time. After this passes, votes are blocked and results become visible to everyone.';

create index if not exists polls_active_featured_idx
  on public.polls (is_active, is_featured, created_at desc);

-- ─── 2. poll_options table ─────────────────────────────────
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  display_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint poll_options_label_len check (char_length(trim(label)) between 1 and 200)
);

comment on table public.poll_options is
  'Choices on a poll. Ordered within a poll by display_order then created_at.';

create index if not exists poll_options_poll_idx
  on public.poll_options (poll_id, display_order);

-- ─── 3. poll_votes table ───────────────────────────────────
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

comment on table public.poll_votes is
  'Individual votes. Unique (poll_id, user_id) means one vote per member per poll. Votes are final; no UPDATE/DELETE policy.';

create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_user_idx on public.poll_votes (user_id);

-- ─── 4. updated_at trigger on polls ────────────────────────
drop trigger if exists polls_updated_at on public.polls;
create trigger polls_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at();

-- ─── 5. RLS — polls ────────────────────────────────────────
alter table public.polls enable row level security;

drop policy if exists "polls public select active" on public.polls;
create policy "polls public select active"
  on public.polls for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "polls elevated admin select all" on public.polls;
create policy "polls elevated admin select all"
  on public.polls for select
  to authenticated
  using (public.kigh_is_elevated_admin());

drop policy if exists "polls elevated admin write" on public.polls;
create policy "polls elevated admin write"
  on public.polls for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── 6. RLS — poll_options ─────────────────────────────────
alter table public.poll_options enable row level security;

drop policy if exists "poll_options public select active" on public.poll_options;
create policy "poll_options public select active"
  on public.poll_options for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id and p.is_active = true
    )
  );

drop policy if exists "poll_options elevated admin select all" on public.poll_options;
create policy "poll_options elevated admin select all"
  on public.poll_options for select
  to authenticated
  using (public.kigh_is_elevated_admin());

drop policy if exists "poll_options elevated admin write" on public.poll_options;
create policy "poll_options elevated admin write"
  on public.poll_options for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── 7. RLS — poll_votes ───────────────────────────────────
alter table public.poll_votes enable row level security;

-- Voter sees their own vote row.
drop policy if exists "poll_votes select own" on public.poll_votes;
create policy "poll_votes select own"
  on public.poll_votes for select
  to authenticated
  using (user_id = auth.uid());

-- Elevated admins see all votes (for results display in the admin UI).
drop policy if exists "poll_votes admin select all" on public.poll_votes;
create policy "poll_votes admin select all"
  on public.poll_votes for select
  to authenticated
  using (public.kigh_is_elevated_admin());

-- A signed-in user can insert their own vote, but only against an
-- active poll that hasn't passed its close time, and the option
-- they pick must actually belong to that poll.
drop policy if exists "poll_votes insert own" on public.poll_votes;
create policy "poll_votes insert own"
  on public.poll_votes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id
        and p.is_active = true
        and (p.closes_at is null or p.closes_at > now())
    )
    and exists (
      select 1 from public.poll_options o
      where o.id = poll_votes.option_id and o.poll_id = poll_votes.poll_id
    )
  );

-- Votes are final: no UPDATE or DELETE policy means both operations
-- are denied by RLS.

-- ─── 8. Grants ─────────────────────────────────────────────
grant select on public.polls to anon, authenticated;
grant insert, update, delete on public.polls to authenticated;
grant select on public.poll_options to anon, authenticated;
grant insert, update, delete on public.poll_options to authenticated;
grant select, insert on public.poll_votes to authenticated;

-- ─── 9. Results RPC ────────────────────────────────────────
-- Returns vote counts per option, but only when at least one of
-- these is true:
--   * caller has voted in this poll
--   * caller is an elevated admin
--   * poll has closed (closes_at in the past)
-- Otherwise raises an exception so the frontend can prompt the user
-- to vote first.
create or replace function public.kigh_poll_results(p_poll_id uuid)
returns table (
  option_id uuid,
  label text,
  display_order integer,
  vote_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_allowed boolean;
begin
  if not exists (select 1 from public.polls where id = p_poll_id) then
    raise exception 'poll not found' using errcode = 'P0002';
  end if;

  select
    public.kigh_is_elevated_admin()
    or (
      v_uid is not null
      and exists (
        select 1 from public.poll_votes v
        where v.poll_id = p_poll_id and v.user_id = v_uid
      )
    )
    or exists (
      select 1 from public.polls p
      where p.id = p_poll_id
        and p.closes_at is not null
        and p.closes_at <= now()
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'results hidden until you vote' using errcode = 'P0001';
  end if;

  return query
    select o.id, o.label, o.display_order,
           (select count(*) from public.poll_votes v where v.option_id = o.id) as vote_count
    from public.poll_options o
    where o.poll_id = p_poll_id
    order by o.display_order, o.created_at;
end;
$$;

revoke all on function public.kigh_poll_results(uuid) from public;
grant execute on function public.kigh_poll_results(uuid) to anon, authenticated;

-- ─── 10. "Have I voted?" helper ────────────────────────────
-- Returns the option_id the caller voted for in this poll, or null.
-- Cheap convenience for the frontend to decide whether to render the
-- voting form or the results view.
create or replace function public.kigh_my_poll_vote(p_poll_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select option_id
  from public.poll_votes
  where poll_id = p_poll_id and user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.kigh_my_poll_vote(uuid) from public;
grant execute on function public.kigh_my_poll_vote(uuid) to authenticated;
