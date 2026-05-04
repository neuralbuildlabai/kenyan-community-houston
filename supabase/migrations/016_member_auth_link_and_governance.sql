-- ============================================================
-- 016 — Member auth link, good-standing, AGM/quorum view
-- ============================================================
-- Enables real member self-service: a `members` row can be linked
-- to an authenticated user (`auth.users.id`) and the member can
-- read/update their own application without admin intervention.
-- Also adds the data the Governance page already promises:
-- good-standing flags and a view for AGM quorum calculations.
-- ============================================================

-- ─── members: auth link, good standing, review fields ──────
alter table public.members add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.members add column if not exists good_standing boolean not null default false;
alter table public.members add column if not exists good_standing_as_of date;
alter table public.members add column if not exists membership_started_at date;
alter table public.members add column if not exists membership_expires_at date;
alter table public.members add column if not exists reviewed_by uuid references auth.users (id) on delete set null;
alter table public.members add column if not exists reviewed_at timestamptz;
alter table public.members add column if not exists review_notes text;

create index if not exists members_user_id_idx on public.members (user_id);
create index if not exists members_good_standing_idx on public.members (good_standing);
create unique index if not exists members_email_unique_idx on public.members (lower(email));

-- ─── household_members: optional auth link ──────────────────
alter table public.household_members add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists household_members_user_id_idx on public.household_members (user_id);

-- ─── members RLS: own-row + admin ───────────────────────────
-- Admin "all access" already exists from migration 004 using is_admin()
-- which now correctly delegates to kigh_is_elevated_admin(). We add
-- self-service policies for the linked auth user.

drop policy if exists "members select own" on public.members;
create policy "members select own"
  on public.members for select
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "members update own basic" on public.members;
create policy "members update own basic"
  on public.members for update
  using (user_id is not null and user_id = auth.uid())
  with check (
    user_id is not null
    and user_id = auth.uid()
    -- Members may not self-elevate their own status / good standing.
    and membership_status = (select m.membership_status from public.members m where m.id = members.id)
    and dues_status      = (select m.dues_status      from public.members m where m.id = members.id)
    and good_standing    = (select m.good_standing    from public.members m where m.id = members.id)
  );

-- household_members: linked-member self access
drop policy if exists "household_members select own" on public.household_members;
create policy "household_members select own"
  on public.household_members for select
  using (
    member_id in (select id from public.members where user_id = auth.uid())
    or (user_id is not null and user_id = auth.uid())
  );

drop policy if exists "household_members write own" on public.household_members;
create policy "household_members write own"
  on public.household_members for all
  using (
    member_id in (select id from public.members where user_id = auth.uid())
    or (user_id is not null and user_id = auth.uid())
  )
  with check (
    member_id in (select id from public.members where user_id = auth.uid())
    or (user_id is not null and user_id = auth.uid())
  );

grant select, update on public.members to authenticated;
grant select, insert, update, delete on public.household_members to authenticated;

-- ─── good standing view ─────────────────────────────────────
create or replace view public.members_in_good_standing as
  select
    m.id,
    m.community_id,
    m.user_id,
    m.first_name,
    m.last_name,
    m.email,
    m.membership_status,
    m.dues_status,
    m.good_standing,
    m.good_standing_as_of,
    m.membership_started_at,
    m.membership_expires_at
  from public.members m
  where m.membership_status = 'active'
    and m.good_standing = true
    and (m.membership_expires_at is null or m.membership_expires_at >= current_date);

comment on view public.members_in_good_standing is
  'Active members in good standing per community. Used for AGM/quorum reporting.';

grant select on public.members_in_good_standing to authenticated;

-- ─── AGM quorum helper ──────────────────────────────────────
create or replace function public.kigh_agm_quorum_required(p_community_id uuid)
returns table (
  community_id uuid,
  total_members_in_good_standing bigint,
  quorum_percent numeric,
  quorum_required integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as community_id,
    coalesce(s.total, 0) as total_members_in_good_standing,
    coalesce(g.quorum_percent, 25) as quorum_percent,
    ceil(coalesce(s.total, 0) * coalesce(g.quorum_percent, 25) / 100.0)::int as quorum_required
  from public.communities c
  left join public.community_governance_settings g on g.community_id = c.id
  left join lateral (
    select count(*)::bigint as total
    from public.members_in_good_standing v
    where v.community_id = c.id
  ) s on true
  where c.id = coalesce(p_community_id, public.kigh_default_community_id())
  limit 1;
$$;

revoke all on function public.kigh_agm_quorum_required(uuid) from public;
grant execute on function public.kigh_agm_quorum_required(uuid) to authenticated;

-- ─── Optional admin RPC: link a members row to an auth user ─
-- Lets membership_manager / community_admin / super_admin convert a
-- public application into a self-service member profile by linking
-- it to an existing auth.users row.
create or replace function public.kigh_link_member_to_user(
  p_member_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.kigh_is_elevated_admin() then
    raise exception 'forbidden';
  end if;

  if p_member_id is null or p_user_id is null then
    raise exception 'invalid_arguments';
  end if;

  update public.members
     set user_id = p_user_id,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_member_id;

  perform public.kigh_record_audit(
    'member.link_to_user',
    'members',
    p_member_id,
    null,
    jsonb_build_object('linked_user_id', p_user_id)
  );
end;
$$;

revoke all on function public.kigh_link_member_to_user(uuid, uuid) from public;
grant execute on function public.kigh_link_member_to_user(uuid, uuid) to authenticated;
