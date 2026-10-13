-- ============================================================
-- Per-event WhatsApp group invite link, shown on the volunteer and
-- vendor "thanks for signing up" screens.
--
-- Kept OUT of public.events on purpose: events is anon-readable, and
-- a group invite link that anyone can scrape invites spam joins. The
-- link lives in an admin-only table and is handed out only by
-- event_whatsapp_group_for_signup(), which requires a live signup for
-- that event with the given phone.
-- ============================================================

create table if not exists public.event_whatsapp_groups (
  event_id uuid primary key references public.events (id) on delete cascade,
  invite_url text not null,
  updated_at timestamptz not null default now(),
  constraint event_whatsapp_groups_url_fmt
    check (invite_url ~ '^https://(chat\.whatsapp\.com|(www\.)?whatsapp\.com/channel)/[A-Za-z0-9_-]+/?$')
);

comment on table public.event_whatsapp_groups is
  'Admin-only WhatsApp group/channel invite link per event. Read publicly only via event_whatsapp_group_for_signup().';

alter table public.event_whatsapp_groups enable row level security;

drop policy if exists "event_whatsapp_groups admin all" on public.event_whatsapp_groups;
create policy "event_whatsapp_groups admin all"
  on public.event_whatsapp_groups for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

grant select, insert, update, delete on public.event_whatsapp_groups to authenticated;
grant select, insert, update, delete on public.event_whatsapp_groups to service_role;

create or replace function public.event_whatsapp_group_for_signup(p_event_id uuid, p_phone text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_phone text := public.kigh_normalize_volunteer_phone(p_phone);
  v_url text;
begin
  if p_event_id is null or v_phone is null or v_phone = '' then
    return null;
  end if;

  if not exists (
    select 1 from public.event_volunteer_signups s
    where s.event_id = p_event_id and s.phone = v_phone
      and s.status not in ('cancelled', 'declined')
  ) and not exists (
    select 1 from public.event_vendor_signups s
    where s.event_id = p_event_id and s.phone = v_phone
      and s.status not in ('cancelled', 'declined')
  ) then
    return null;
  end if;

  select g.invite_url into v_url
  from public.event_whatsapp_groups g
  where g.event_id = p_event_id;

  return v_url;
end;
$$;

comment on function public.event_whatsapp_group_for_signup(uuid, text) is
  'Returns the event''s WhatsApp group invite link only when a non-cancelled volunteer or vendor signup exists for that event and phone; otherwise null.';

revoke all on function public.event_whatsapp_group_for_signup(uuid, text) from public;
grant execute on function public.event_whatsapp_group_for_signup(uuid, text) to anon, authenticated;
