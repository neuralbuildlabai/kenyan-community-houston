-- ============================================================
-- 030 — Community Requests (tracked chat) + Event comments
-- ============================================================
-- Tracked member requests with one active thread per user (partial
-- unique index). Event Q&A with moderation (pending → approved).
-- Uses existing public.is_admin() → kigh_is_elevated_admin() pattern.
-- Idempotent where practical.
-- ============================================================

-- ─── 1. chat_threads ─────────────────────────────────────────
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'general',
  status text not null default 'open',
  priority text not null default 'normal',
  assigned_admin_id uuid references auth.users (id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  close_reason text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_threads_title_len check (char_length(trim(title)) between 5 and 120),
  constraint chat_threads_category_check check (
    category in (
      'general', 'events', 'membership', 'business_services', 'volunteering',
      'community_support', 'new_to_houston', 'technical_support', 'other'
    )
  ),
  constraint chat_threads_status_check check (
    status in ('open', 'pending_admin', 'pending_member', 'closed', 'archived')
  ),
  constraint chat_threads_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint chat_threads_close_reason_len check (
    close_reason is null or char_length(trim(close_reason)) <= 500
  )
);

create index if not exists chat_threads_user_id_idx on public.chat_threads (user_id);
create index if not exists chat_threads_status_idx on public.chat_threads (status);
create index if not exists chat_threads_category_idx on public.chat_threads (category);
create index if not exists chat_threads_last_message_at_idx on public.chat_threads (last_message_at desc);

drop index if exists public.one_active_chat_thread_per_user;
create unique index one_active_chat_thread_per_user
  on public.chat_threads (user_id)
  where status in ('open', 'pending_admin', 'pending_member');

drop trigger if exists chat_threads_updated_at on public.chat_threads;
create trigger chat_threads_updated_at
  before update on public.chat_threads
  for each row execute function public.set_updated_at();

comment on table public.chat_threads is
  'Tracked community requests; at most one active (open/pending_*) row per user_id.';

-- ─── 2. chat_messages ───────────────────────────────────────
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_role text not null default 'member',
  body text not null,
  is_internal_note boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chat_messages_body_len check (char_length(trim(body)) between 1 and 3000),
  constraint chat_messages_sender_role_check check (sender_role in ('member', 'admin', 'system'))
);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at);
create index if not exists chat_messages_sender_id_idx on public.chat_messages (sender_id);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

-- Bump thread last_message_at + workflow status after each message.
create or replace function public.chat_messages_after_insert_bump_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_threads ct
  set
    last_message_at = new.created_at,
    updated_at = now(),
    status = case
      when ct.status in ('closed', 'archived') then ct.status
      when new.is_internal_note then ct.status
      when new.sender_role = 'member' and ct.status in ('open', 'pending_admin', 'pending_member')
        then 'pending_admin'
      when new.sender_role = 'admin' and ct.status in ('open', 'pending_admin', 'pending_member')
        then 'pending_member'
      else ct.status
    end
  where ct.id = new.thread_id;
  return new;
end;
$$;

revoke all on function public.chat_messages_after_insert_bump_thread() from public;

drop trigger if exists chat_messages_after_insert_bump_thread on public.chat_messages;
create trigger chat_messages_after_insert_bump_thread
  after insert on public.chat_messages
  for each row execute function public.chat_messages_after_insert_bump_thread();

comment on function public.chat_messages_after_insert_bump_thread() is
  'Maintains chat_threads.last_message_at and status after each message (migration 030).';

-- ─── 3. event_comments ───────────────────────────────────────
create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  status text not null default 'pending',
  parent_comment_id uuid references public.event_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_comments_body_len check (char_length(trim(body)) between 1 and 2000),
  constraint event_comments_status_check check (
    status in ('pending', 'approved', 'hidden', 'removed')
  )
);

create index if not exists event_comments_event_status_created_idx
  on public.event_comments (event_id, status, created_at);
create index if not exists event_comments_user_id_idx on public.event_comments (user_id);
create index if not exists event_comments_parent_idx on public.event_comments (parent_comment_id);

drop trigger if exists event_comments_updated_at on public.event_comments;
create trigger event_comments_updated_at
  before update on public.event_comments
  for each row execute function public.set_updated_at();

create or replace function public.event_comments_parent_same_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_eid uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;
  select event_id into v_eid from public.event_comments where id = new.parent_comment_id;
  if v_eid is null or v_eid is distinct from new.event_id then
    raise exception 'event_comments_parent_event_mismatch';
  end if;
  return new;
end;
$$;

revoke all on function public.event_comments_parent_same_event() from public;

drop trigger if exists event_comments_parent_guard on public.event_comments;
create trigger event_comments_parent_guard
  before insert or update on public.event_comments
  for each row execute function public.event_comments_parent_same_event();

comment on table public.event_comments is
  'Event Q&A; public reads approved only; members insert pending; admins moderate.';

-- ─── 4. RPC: atomic create request + first message ──────────
create or replace function public.create_chat_request(p_title text, p_category text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := trim(p_title);
  v_body text := trim(p_body);
  v_cat text := lower(trim(coalesce(nullif(trim(p_category), ''), 'general')));
  v_tid uuid;
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  if char_length(v_title) < 5 or char_length(v_title) > 120 then
    raise exception 'invalid_title_length';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 3000 then
    raise exception 'invalid_body_length';
  end if;

  if v_cat not in (
    'general', 'events', 'membership', 'business_services', 'volunteering',
    'community_support', 'new_to_houston', 'technical_support', 'other'
  ) then
    raise exception 'invalid_category';
  end if;

  insert into public.chat_threads (user_id, title, category, status)
  values (v_uid, v_title, v_cat, 'open')
  returning id into v_tid;

  insert into public.chat_messages (thread_id, sender_id, sender_role, body, is_internal_note)
  values (v_tid, v_uid, 'member', v_body, false);

  return v_tid;
exception
  when unique_violation then
    raise exception 'active_request_already_exists' using errcode = '23505';
end;
$$;

revoke all on function public.create_chat_request(text, text, text) from public;
grant execute on function public.create_chat_request(text, text, text) to authenticated;

comment on function public.create_chat_request(text, text, text) is
  'Authenticated-only atomic create: one chat_threads row + first member message. Enforced with partial unique index on active statuses.';

-- ─── 5. RPC: member closes own active request ─────────────────
create or replace function public.close_chat_request(p_thread_id uuid, p_close_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := left(trim(coalesce(p_close_reason, '')), 500);
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  update public.chat_threads
  set
    status = 'closed',
    closed_at = now(),
    closed_by = v_uid,
    close_reason = nullif(v_reason, ''),
    updated_at = now()
  where id = p_thread_id
    and user_id = v_uid
    and status in ('open', 'pending_admin', 'pending_member');

  if not FOUND then
    raise exception 'cannot_close_thread';
  end if;
end;
$$;

revoke all on function public.close_chat_request(uuid, text) from public;
grant execute on function public.close_chat_request(uuid, text) to authenticated;

comment on function public.close_chat_request(uuid, text) is
  'Owner closes an active community request; SECURITY DEFINER with strict ownership checks.';

-- ─── 6. Grants (table-level; RLS still applies) ───────────────
grant select on public.chat_threads to authenticated;
revoke insert, update, delete on public.chat_threads from authenticated;
revoke all on public.chat_threads from anon;
-- No direct insert/update/delete for members on threads — use RPCs + admin policies.

grant select, insert on public.chat_messages to authenticated;
revoke all on public.chat_messages from anon;

grant select, insert, update, delete on public.chat_threads to service_role;
grant select, insert, update, delete on public.chat_messages to service_role;
grant select, insert, update, delete on public.event_comments to service_role;

grant select, insert, update, delete on public.chat_threads to postgres;
grant select, insert, update, delete on public.chat_messages to postgres;
grant select, insert, update, delete on public.event_comments to postgres;

grant select on public.event_comments to anon, authenticated;
grant insert on public.event_comments to authenticated;

-- ─── 7. RLS: chat_threads ────────────────────────────────────
alter table public.chat_threads enable row level security;

drop policy if exists "chat_threads select own or admin" on public.chat_threads;
create policy "chat_threads select own or admin"
  on public.chat_threads for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "chat_threads insert admin only" on public.chat_threads;
create policy "chat_threads insert admin only"
  on public.chat_threads for insert
  with check (public.is_admin());

drop policy if exists "chat_threads update admin" on public.chat_threads;
create policy "chat_threads update admin"
  on public.chat_threads for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "chat_threads delete admin" on public.chat_threads;
create policy "chat_threads delete admin"
  on public.chat_threads for delete
  using (public.is_admin());

-- ─── 8. RLS: chat_messages ───────────────────────────────────
alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages select member own thread" on public.chat_messages;
create policy "chat_messages select member own thread"
  on public.chat_messages for select
  using (
    public.is_admin()
    or (
      exists (
        select 1 from public.chat_threads ct
        where ct.id = chat_messages.thread_id
          and ct.user_id = auth.uid()
      )
      and is_internal_note = false
    )
  );

drop policy if exists "chat_messages insert member own active" on public.chat_messages;
create policy "chat_messages insert member own active"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and sender_role = 'member'
    and is_internal_note = false
    and exists (
      select 1 from public.chat_threads ct
      where ct.id = thread_id
        and ct.user_id = auth.uid()
        and ct.status in ('open', 'pending_admin', 'pending_member')
    )
  );

drop policy if exists "chat_messages insert admin" on public.chat_messages;
create policy "chat_messages insert admin"
  on public.chat_messages for insert
  with check (
    public.is_admin()
    and sender_id = auth.uid()
    and sender_role = 'admin'
  );

drop policy if exists "chat_messages update admin" on public.chat_messages;
create policy "chat_messages update admin"
  on public.chat_messages for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "chat_messages delete admin" on public.chat_messages;
create policy "chat_messages delete admin"
  on public.chat_messages for delete
  using (public.is_admin());

-- ─── 9. RLS: event_comments ───────────────────────────────────
alter table public.event_comments enable row level security;

drop policy if exists "event_comments public read approved" on public.event_comments;
create policy "event_comments public read approved"
  on public.event_comments for select
  using (status = 'approved');

drop policy if exists "event_comments member read own pending" on public.event_comments;
create policy "event_comments member read own pending"
  on public.event_comments for select
  using (auth.uid() is not null and user_id = auth.uid() and status = 'pending');

drop policy if exists "event_comments admin read all" on public.event_comments;
create policy "event_comments admin read all"
  on public.event_comments for select
  using (public.is_admin());

drop policy if exists "event_comments member insert pending" on public.event_comments;
create policy "event_comments member insert pending"
  on public.event_comments for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "event_comments admin moderate" on public.event_comments;
create policy "event_comments admin moderate"
  on public.event_comments for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "event_comments admin delete" on public.event_comments;
create policy "event_comments admin delete"
  on public.event_comments for delete
  using (public.is_admin());

-- Members must not self-approve: insert policy forces pending; no member update policy.

-- ─── 10. Harden default privileges (anon has no business here) ─
revoke all on public.chat_threads from anon;
revoke all on public.chat_messages from anon;
revoke insert, update, delete on public.event_comments from anon;
