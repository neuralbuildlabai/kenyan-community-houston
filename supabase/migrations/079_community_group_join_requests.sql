-- ============================================================
-- 079 — Community group join requests
-- ============================================================
-- Lets visitors ask to join a published community group from
-- /community-groups. Groups run their own membership, so a request is
-- routed through KIGH admins: it lands in the admin inbox
-- (/admin/community-groups + dashboard "Needs attention"), and an admin
-- forwards it to the group's contact person.
--
-- Rows are created ONLY through submit_community_group_join_request
-- (anon + authenticated); reading and triage are elevated-admin only.
-- Idempotent.

-- ─── 1. Table ───────────────────────────────────────────────
create table if not exists public.community_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups (id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  message text,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'new',
  forwarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cgjr_status_check check (status in ('new', 'forwarded', 'closed')),
  constraint cgjr_name_len check (char_length(requester_name) between 2 and 120),
  constraint cgjr_email_len check (char_length(requester_email) between 3 and 254),
  constraint cgjr_phone_len check (requester_phone is null or char_length(requester_phone) <= 20),
  constraint cgjr_message_len check (message is null or char_length(message) <= 1000)
);

create index if not exists cgjr_group_created_idx
  on public.community_group_join_requests (group_id, created_at desc);
create index if not exists cgjr_status_created_idx
  on public.community_group_join_requests (status, created_at desc);
create index if not exists cgjr_email_created_idx
  on public.community_group_join_requests (requester_email, created_at desc);

drop trigger if exists community_group_join_requests_updated_at on public.community_group_join_requests;
create trigger community_group_join_requests_updated_at
  before update on public.community_group_join_requests
  for each row execute function set_updated_at();

-- ─── 2. RLS + grants ────────────────────────────────────────
alter table public.community_group_join_requests enable row level security;

drop policy if exists "cgjr elevated admin select" on public.community_group_join_requests;
create policy "cgjr elevated admin select"
  on public.community_group_join_requests for select
  to authenticated
  using (public.kigh_is_elevated_admin());

drop policy if exists "cgjr elevated admin update" on public.community_group_join_requests;
create policy "cgjr elevated admin update"
  on public.community_group_join_requests for update
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

drop policy if exists "cgjr elevated admin delete" on public.community_group_join_requests;
create policy "cgjr elevated admin delete"
  on public.community_group_join_requests for delete
  to authenticated
  using (public.kigh_is_elevated_admin());

-- No insert policy: requests are created only by the SECURITY DEFINER RPC below.
revoke all on table public.community_group_join_requests from anon;
revoke all on table public.community_group_join_requests from public;
grant select, update, delete on table public.community_group_join_requests to authenticated;

-- ─── 3. Public submit RPC ───────────────────────────────────
create or replace function public.submit_community_group_join_request(
  p_group_id uuid,
  p_name text,
  p_email text,
  p_phone text default null,
  p_message text default null
)
returns table (
  request_id uuid,
  organization_name text,
  already_requested boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_name     text := trim(coalesce(p_name, ''));
  v_email    text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone    text := nullif(public.kigh_normalize_volunteer_phone(p_phone), '');
  v_message  text := nullif(trim(coalesce(p_message, '')), '');
  v_group_id uuid;
  v_group_nm text;
  v_existing uuid;
  v_id       uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  if public.kigh_contains_blocked_language(v_name) then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;

  if v_email is null
    or char_length(v_email) > 254
    or v_email !~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is not null
    and (v_phone is null or v_phone !~ '^\+?[0-9]{7,15}$') then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  if v_message is not null and (
    char_length(v_message) > 1000
    or public.kigh_contains_blocked_language(v_message)
  ) then
    raise exception 'invalid_message' using errcode = 'P0001';
  end if;

  -- Same visibility rule as list_public_community_groups.
  select cg.id, cg.organization_name
    into v_group_id, v_group_nm
  from public.community_groups cg
  where cg.id = p_group_id
    and cg.status in ('approved', 'published');

  if v_group_id is null then
    raise exception 'group_not_found' using errcode = 'P0001';
  end if;

  -- A repeat click returns the open request instead of queueing a duplicate.
  select r.id into v_existing
  from public.community_group_join_requests r
  where r.group_id = v_group_id
    and r.requester_email = v_email
    and r.status <> 'closed'
    and r.created_at > now() - interval '30 days'
  order by r.created_at desc
  limit 1;

  if v_existing is not null then
    return query select v_existing, v_group_nm, true;
    return;
  end if;

  -- Throttle one address to 10 requests a day across all groups.
  if (
    select count(*)
    from public.community_group_join_requests r
    where r.requester_email = v_email
      and r.created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.community_group_join_requests
    (group_id, requester_name, requester_email, requester_phone, message, user_id)
  values
    (v_group_id, v_name, v_email, v_phone, v_message, auth.uid())
  returning community_group_join_requests.id into v_id;

  return query select v_id, v_group_nm, false;
end;
$$;

revoke all on function public.submit_community_group_join_request(uuid, text, text, text, text) from public;
grant execute on function public.submit_community_group_join_request(uuid, text, text, text, text) to anon, authenticated;
