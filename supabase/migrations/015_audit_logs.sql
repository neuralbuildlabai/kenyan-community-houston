-- ============================================================
-- 015 — Audit logs
-- ============================================================
-- Practical audit logging foundation. Triggers can be added in a
-- follow-up; for now we ship the table, RLS, indexes, and a helper
-- writer function that admin-side code (or DEFINER functions) can
-- call. Service-role / SECURITY DEFINER inserts always pass.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_community_idx on public.audit_logs (community_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- Reads:
--   - super_admin: all rows
--   - other elevated admins: scoped to communities they admin
drop policy if exists "audit_logs read elevated" on public.audit_logs;
create policy "audit_logs read elevated"
  on public.audit_logs for select
  using (
    public.kigh_is_platform_super_admin()
    or (
      public.kigh_is_elevated_admin()
      and (
        community_id is null
        or public.kigh_has_community_role(
            array['community_admin','admin','content_manager','membership_manager','treasurer','media_moderator','ads_manager'],
            community_id
          )
      )
    )
  );

-- Writes: only via SECURITY DEFINER function below or service role.
drop policy if exists "audit_logs no client write" on public.audit_logs;
create policy "audit_logs no client write"
  on public.audit_logs for insert
  with check (false);

-- Updates / deletes are denied for everyone except service role.
drop policy if exists "audit_logs no update" on public.audit_logs;
create policy "audit_logs no update"
  on public.audit_logs for update
  using (false)
  with check (false);

drop policy if exists "audit_logs no delete" on public.audit_logs;
create policy "audit_logs no delete"
  on public.audit_logs for delete
  using (false);

grant select on public.audit_logs to authenticated;

-- ─── Writer helper (SECURITY DEFINER) ───────────────────────
-- Callable by elevated admins to record an audited action. For
-- triggers / DB-internal events, use service role or rewrap this in
-- another SECURITY DEFINER trigger.
create or replace function public.kigh_record_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_community_id uuid default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
  v_email text;
  v_role text;
begin
  -- Only elevated admins (or service role with no auth.uid()) can record audits.
  if v_uid is not null and not public.kigh_is_elevated_admin() then
    raise exception 'audit_forbidden';
  end if;

  if v_uid is not null then
    select email into v_email from auth.users where id = v_uid;
    select coalesce(trim(role), '') into v_role from public.profiles where id = v_uid;
  end if;

  insert into public.audit_logs (
    community_id, actor_user_id, actor_email, actor_role,
    action, entity_type, entity_id, metadata
  ) values (
    coalesce(p_community_id, public.kigh_default_community_id()),
    v_uid, v_email, v_role,
    p_action, p_entity_type, p_entity_id, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.kigh_record_audit(text, text, uuid, uuid, jsonb) from public;
grant execute on function public.kigh_record_audit(text, text, uuid, uuid, jsonb)
  to authenticated;

comment on function public.kigh_record_audit(text, text, uuid, uuid, jsonb) is
  'Append-only audit log writer; only elevated admins may call from client. Triggers should rewrap.';
