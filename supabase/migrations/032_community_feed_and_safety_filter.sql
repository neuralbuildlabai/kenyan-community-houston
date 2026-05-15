-- ============================================================
-- 032 — Community feed, reactions, moderation, and safety filter
-- ============================================================
-- Public community feed (auto-approved posts for active members),
-- rate limits, comments (200 chars), RLS, and shared moderation
-- helpers reused via triggers on event_comments, chat_messages,
-- and member_invites.personal_note. Extends create_chat_request.
-- Idempotent where practical.
-- ============================================================

-- ─── 0. Text normalization (internal) ───────────────────────
create or replace function public.kigh_normalize_text_for_moderation(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select trim(both ' ' from regexp_replace(lower(trim(coalesce(p_text, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;

revoke all on function public.kigh_normalize_text_for_moderation(text) from public;

-- ─── 1. Blocked language (maintain in one place; not exposed to clients) ─
create or replace function public.kigh_contains_blocked_language(p_text text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_norm text := public.kigh_normalize_text_for_moderation(p_text);
  v_pad text := ' ' || v_norm || ' ';
  w text;
  v_terms text[] := array[
    'fuck', 'fucking', 'fucked', 'fucker', 'motherfucker', 'mf', 'shit', 'bullshit', 'bitch',
    'bastard', 'asshole', 'damn', 'crap', 'piss', 'dick', 'cock', 'cunt', 'pussy', 'slut', 'whore',
    'retard', 'retarded', 'nigger', 'nigga', 'faggot', 'fag', 'chink', 'spic', 'kike', 'wetback',
    'terrorist', 'kill yourself', 'kys', 'die in a fire', 'go die', 'rape', 'raping', 'molest',
    'nazi', 'heil hitler', 'white power', 'lynch', 'n1gger', 'f4g', 'sh1t', 'fuk', 'fck'
  ];
begin
  if coalesce(v_norm, '') = '' then
    return false;
  end if;
  foreach w in array v_terms
  loop
    if position((' ' || w || ' ') in v_pad) > 0 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

revoke all on function public.kigh_contains_blocked_language(text) from public;

-- ─── 2. Discourage private contact / address patterns in public text ───
create or replace function public.kigh_contains_sensitive_public_sharing(p_text text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  t text := coalesce(p_text, '');
begin
  -- Email
  if t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    return true;
  end if;
  -- US-style phone patterns (digits with typical separators)
  if t ~* '(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b' then
    return true;
  end if;
  -- Simple street address cue: number + street-type word
  if t ~* '[0-9]{1,6}\s+[a-z0-9''\s-]{2,40}\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard)([^a-z]|$)' then
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.kigh_contains_sensitive_public_sharing(text) from public;

-- ─── 3. Approved member (active membership) ─────────────────
create or replace function public.kigh_is_approved_member()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.user_id is not null
      and m.user_id = auth.uid()
      and m.membership_status = 'active'
  );
$$;

comment on function public.kigh_is_approved_member() is
  'True when auth.uid() is linked to a members row with membership_status = active.';

revoke all on function public.kigh_is_approved_member() from public;
grant execute on function public.kigh_is_approved_member() to authenticated, anon;

-- ─── 4. Feed-safe display name (SECURITY DEFINER; no PII in return) ───
create or replace function public.kigh_feed_safe_display_name(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_elev boolean;
  fn text;
  ln text;
begin
  if p_user_id is null then
    return 'Community Member';
  end if;

  select exists (
    select 1
    from public.profiles pr
    where pr.id = p_user_id
      and coalesce(trim(pr.role), '') in (
        'super_admin', 'platform_admin', 'community_admin', 'admin', 'content_manager',
        'membership_manager', 'treasurer', 'media_moderator', 'ads_manager',
        'business_admin', 'support_admin', 'moderator'
      )
  ) into v_elev;

  if v_elev then
    return 'Kenyan Community Houston';
  end if;

  select nullif(trim(m.first_name), ''), nullif(trim(m.last_name), '')
    into fn, ln
  from public.members m
  where m.user_id = p_user_id
  limit 1;

  if fn is not null and ln is not null then
    return fn || ' ' || upper(substr(ln, 1, 1)) || '.';
  elsif fn is not null then
    return fn;
  end if;

  return 'Community Member';
end;
$$;

revoke all on function public.kigh_feed_safe_display_name(uuid) from public;

-- ─── 5. Tables ───────────────────────────────────────────────
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  status text not null default 'approved',
  post_type text not null default 'general',
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references auth.users (id) on delete set null,
  removed_reason text,
  constraint feed_posts_body_len check (char_length(trim(body)) between 1 and 2000),
  constraint feed_posts_status_check check (status in ('approved', 'hidden', 'removed')),
  constraint feed_posts_post_type_check check (
    post_type in ('general', 'question', 'resource', 'celebration', 'reminder', 'referral')
  ),
  constraint feed_posts_removed_reason_len check (
    removed_reason is null or char_length(trim(removed_reason)) <= 500
  )
);

create index if not exists feed_posts_status_created_idx on public.feed_posts (status, created_at desc);
create index if not exists feed_posts_author_id_idx on public.feed_posts (author_id);
create index if not exists feed_posts_post_type_idx on public.feed_posts (post_type);
create index if not exists feed_posts_comments_enabled_idx on public.feed_posts (comments_enabled);

drop trigger if exists feed_posts_updated_at on public.feed_posts;
create trigger feed_posts_updated_at
  before update on public.feed_posts
  for each row execute function public.set_updated_at();

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  status text not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references auth.users (id) on delete set null,
  removed_reason text,
  constraint feed_comments_body_len check (char_length(trim(body)) between 1 and 200),
  constraint feed_comments_status_check check (status in ('approved', 'hidden', 'removed')),
  constraint feed_comments_removed_reason_len check (
    removed_reason is null or char_length(trim(removed_reason)) <= 500
  )
);

create index if not exists feed_comments_post_status_created_idx
  on public.feed_comments (post_id, status, created_at);
create index if not exists feed_comments_author_id_idx on public.feed_comments (author_id);

drop trigger if exists feed_comments_updated_at on public.feed_comments;
create trigger feed_comments_updated_at
  before update on public.feed_comments
  for each row execute function public.set_updated_at();

create table if not exists public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default now(),
  constraint feed_reactions_type_check check (reaction_type in ('like')),
  constraint feed_reactions_unique_user unique (post_id, user_id, reaction_type)
);

create index if not exists feed_reactions_post_id_idx on public.feed_reactions (post_id);
create index if not exists feed_reactions_user_id_idx on public.feed_reactions (user_id);

comment on table public.feed_posts is 'Community feed posts; public reads approved only; writes via RPCs + RLS.';
comment on table public.feed_comments is 'Feed comments; max 200 chars; public reads approved on approved posts.';
comment on table public.feed_reactions is 'Per-user likes on feed posts.';

-- ─── 6. RPC: create_feed_post ─────────────────────────────────
create or replace function public.create_feed_post(
  p_body text,
  p_post_type text,
  p_comments_enabled boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_pt text := lower(trim(coalesce(p_post_type, 'general')));
  v_day date := (timezone('America/Chicago', now()))::date;
  v_week_start timestamptz := now() - interval '7 days';
  v_daily int;
  v_weekly int;
  v_id uuid;
  v_ce boolean := coalesce(p_comments_enabled, true);
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  if not (public.kigh_is_approved_member() or public.kigh_is_elevated_admin()) then
    raise exception 'not_approved_member';
  end if;

  if char_length(v_body) < 1 then
    raise exception 'body_required';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'body_too_long';
  end if;

  if v_pt not in ('general', 'question', 'resource', 'celebration', 'reminder', 'referral') then
    raise exception 'invalid_post_type';
  end if;

  if public.kigh_contains_blocked_language(v_body) then
    raise exception 'inappropriate_content';
  end if;

  if public.kigh_contains_sensitive_public_sharing(v_body) then
    raise exception 'private_information_sharing';
  end if;

  if not public.kigh_is_elevated_admin() then
    select count(*)::int into v_daily
    from public.feed_posts fp
    where fp.author_id = v_uid
      and (timezone('America/Chicago', fp.created_at))::date = v_day;

    if v_daily >= 1 then
      raise exception 'post_daily_limit_reached';
    end if;

    select count(*)::int into v_weekly
    from public.feed_posts fp
    where fp.author_id = v_uid
      and fp.created_at >= v_week_start;

    if v_weekly >= 3 then
      raise exception 'post_weekly_limit_reached';
    end if;
  end if;

  insert into public.feed_posts (author_id, body, status, post_type, comments_enabled)
  values (v_uid, v_body, 'approved', v_pt, v_ce)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_feed_post(text, text, boolean) from public;
grant execute on function public.create_feed_post(text, text, boolean) to authenticated;

-- ─── 7. RPC: create_feed_comment ──────────────────────────────
create or replace function public.create_feed_comment(p_post_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := trim(coalesce(p_body, ''));
  v_post public.feed_posts%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  if not (public.kigh_is_approved_member() or public.kigh_is_elevated_admin()) then
    raise exception 'not_approved_member';
  end if;

  select * into v_post from public.feed_posts where id = p_post_id;
  if v_post.id is null then
    raise exception 'post_not_available';
  end if;

  if v_post.status is distinct from 'approved' or v_post.removed_at is not null then
    raise exception 'post_not_available';
  end if;

  if not v_post.comments_enabled and not public.kigh_is_elevated_admin() then
    raise exception 'comments_disabled';
  end if;

  if char_length(v_body) < 1 then
    raise exception 'comment_required';
  end if;
  if char_length(v_body) > 200 then
    raise exception 'comment_too_long';
  end if;

  if public.kigh_contains_blocked_language(v_body) then
    raise exception 'inappropriate_content';
  end if;

  if public.kigh_contains_sensitive_public_sharing(v_body) then
    raise exception 'private_information_sharing';
  end if;

  insert into public.feed_comments (post_id, author_id, body, status)
  values (p_post_id, v_uid, v_body, 'approved')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_feed_comment(uuid, text) from public;
grant execute on function public.create_feed_comment(uuid, text) to authenticated;

-- ─── 8. RPC: toggle comments on own post ─────────────────────
create or replace function public.toggle_feed_post_comments(p_post_id uuid, p_comments_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.feed_posts%rowtype;
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  select * into r from public.feed_posts where id = p_post_id for update;
  if r.id is null then
    raise exception 'post_not_available';
  end if;

  if r.status = 'removed' then
    raise exception 'post_not_available';
  end if;

  if not (
    (r.author_id = v_uid and r.status in ('approved', 'hidden'))
    or public.kigh_is_elevated_admin()
  ) then
    raise exception 'forbidden';
  end if;

  update public.feed_posts
  set comments_enabled = p_comments_enabled, updated_at = now()
  where id = p_post_id;
end;
$$;

revoke all on function public.toggle_feed_post_comments(uuid, boolean) from public;
grant execute on function public.toggle_feed_post_comments(uuid, boolean) to authenticated;

-- ─── 9. RPC: moderation ───────────────────────────────────────
create or replace function public.moderate_feed_post(
  p_post_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_st text := lower(trim(coalesce(p_status, '')));
  v_reason text := left(trim(coalesce(p_reason, '')), 500);
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden';
  end if;

  if v_st not in ('approved', 'hidden', 'removed') then
    raise exception 'invalid_status';
  end if;

  update public.feed_posts
  set
    status = v_st,
    removed_at = case when v_st in ('hidden', 'removed') then now() else null end,
    removed_by = case when v_st in ('hidden', 'removed') then auth.uid() else null end,
    removed_reason = case when v_st in ('hidden', 'removed') then nullif(v_reason, '') else null end,
    updated_at = now()
  where id = p_post_id;

  if not found then
    raise exception 'post_not_available';
  end if;
end;
$$;

revoke all on function public.moderate_feed_post(uuid, text, text) from public;
grant execute on function public.moderate_feed_post(uuid, text, text) to authenticated;

create or replace function public.moderate_feed_comment(
  p_comment_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_st text := lower(trim(coalesce(p_status, '')));
  v_reason text := left(trim(coalesce(p_reason, '')), 500);
begin
  if auth.uid() is null or not public.kigh_is_elevated_admin() then
    raise exception 'forbidden';
  end if;

  if v_st not in ('approved', 'hidden', 'removed') then
    raise exception 'invalid_status';
  end if;

  update public.feed_comments
  set
    status = v_st,
    removed_at = case when v_st in ('hidden', 'removed') then now() else null end,
    removed_by = case when v_st in ('hidden', 'removed') then auth.uid() else null end,
    removed_reason = case when v_st in ('hidden', 'removed') then nullif(v_reason, '') else null end,
    updated_at = now()
  where id = p_comment_id;

  if not found then
    raise exception 'comment_not_found';
  end if;
end;
$$;

revoke all on function public.moderate_feed_comment(uuid, text, text) from public;
grant execute on function public.moderate_feed_comment(uuid, text, text) to authenticated;

-- ─── 10. RPC: rate-limit hint for UI ───────────────────────────
create or replace function public.feed_post_limit_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (timezone('America/Chicago', now()))::date;
  v_week_start timestamptz := now() - interval '7 days';
  v_daily int;
  v_weekly int;
begin
  if v_uid is null then
    return jsonb_build_object('can_post', false, 'reason', 'not_authenticated');
  end if;

  if public.kigh_is_elevated_admin() then
    return jsonb_build_object('can_post', true, 'reason', 'admin');
  end if;

  if not public.kigh_is_approved_member() then
    return jsonb_build_object('can_post', false, 'reason', 'not_approved_member');
  end if;

  select count(*)::int into v_daily
  from public.feed_posts fp
  where fp.author_id = v_uid
    and (timezone('America/Chicago', fp.created_at))::date = v_day;

  if v_daily >= 1 then
    return jsonb_build_object('can_post', false, 'reason', 'post_daily_limit_reached');
  end if;

  select count(*)::int into v_weekly
  from public.feed_posts fp
  where fp.author_id = v_uid
    and fp.created_at >= v_week_start;

  if v_weekly >= 3 then
    return jsonb_build_object('can_post', false, 'reason', 'post_weekly_limit_reached');
  end if;

  return jsonb_build_object('can_post', true, 'reason', 'ok');
end;
$$;

revoke all on function public.feed_post_limit_status() from public;
grant execute on function public.feed_post_limit_status() to authenticated;

-- ─── 11. RPC: public-safe list (no raw member PII) ─────────────
create or replace function public.list_community_feed_posts(p_limit int default 30)
returns table (
  id uuid,
  body text,
  post_type text,
  comments_enabled boolean,
  created_at timestamptz,
  author_display_name text,
  like_count bigint,
  comment_count bigint,
  is_owner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    fp.id,
    fp.body,
    fp.post_type,
    fp.comments_enabled,
    fp.created_at,
    public.kigh_feed_safe_display_name(fp.author_id) as author_display_name,
    (select count(*)::bigint from public.feed_reactions r where r.post_id = fp.id and r.reaction_type = 'like'),
    (
      select count(*)::bigint
      from public.feed_comments c
      where c.post_id = fp.id
        and c.status = 'approved'
        and c.removed_at is null
    ),
    (auth.uid() is not null and fp.author_id = auth.uid()) as is_owner
  from public.feed_posts fp
  where fp.status = 'approved'
    and fp.removed_at is null
  order by fp.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$$;

revoke all on function public.list_community_feed_posts(int) from public;
grant execute on function public.list_community_feed_posts(int) to anon, authenticated;

create or replace function public.list_community_feed_comments(p_post_id uuid)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  author_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.body,
    c.created_at,
    public.kigh_feed_safe_display_name(c.author_id) as author_display_name
  from public.feed_comments c
  join public.feed_posts fp on fp.id = c.post_id
  where c.post_id = p_post_id
    and c.status = 'approved'
    and c.removed_at is null
    and fp.status = 'approved'
    and fp.removed_at is null
  order by c.created_at asc;
$$;

revoke all on function public.list_community_feed_comments(uuid) from public;
grant execute on function public.list_community_feed_comments(uuid) to anon, authenticated;

-- ─── 12. RLS feed_posts ───────────────────────────────────────
alter table public.feed_posts enable row level security;

drop policy if exists "feed_posts public read approved" on public.feed_posts;
create policy "feed_posts public read approved"
  on public.feed_posts for select
  using (
    status = 'approved'
    and removed_at is null
  );

drop policy if exists "feed_posts author read own moderated" on public.feed_posts;
create policy "feed_posts author read own moderated"
  on public.feed_posts for select
  to authenticated
  using (author_id = auth.uid());

drop policy if exists "feed_posts admin all" on public.feed_posts;
drop policy if exists "feed_posts no direct insert" on public.feed_posts;
drop policy if exists "feed_posts admin select" on public.feed_posts;
drop policy if exists "feed_posts admin update" on public.feed_posts;
drop policy if exists "feed_posts admin delete" on public.feed_posts;

create policy "feed_posts admin select"
  on public.feed_posts for select
  to authenticated
  using (public.is_admin());

create policy "feed_posts admin update"
  on public.feed_posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "feed_posts admin delete"
  on public.feed_posts for delete
  to authenticated
  using (public.is_admin());

-- ─── 13. RLS feed_comments ────────────────────────────────────
alter table public.feed_comments enable row level security;

drop policy if exists "feed_comments public read approved chain" on public.feed_comments;
create policy "feed_comments public read approved chain"
  on public.feed_comments for select
  using (
    status = 'approved'
    and removed_at is null
    and exists (
      select 1 from public.feed_posts fp
      where fp.id = feed_comments.post_id
        and fp.status = 'approved'
        and fp.removed_at is null
    )
  );

drop policy if exists "feed_comments author read own" on public.feed_comments;
create policy "feed_comments author read own"
  on public.feed_comments for select
  to authenticated
  using (author_id = auth.uid());

drop policy if exists "feed_comments admin all" on public.feed_comments;
drop policy if exists "feed_comments no direct insert" on public.feed_comments;
drop policy if exists "feed_comments admin select" on public.feed_comments;
drop policy if exists "feed_comments admin update" on public.feed_comments;
drop policy if exists "feed_comments admin delete" on public.feed_comments;

create policy "feed_comments admin select"
  on public.feed_comments for select
  to authenticated
  using (public.is_admin());

create policy "feed_comments admin update"
  on public.feed_comments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "feed_comments admin delete"
  on public.feed_comments for delete
  to authenticated
  using (public.is_admin());

-- ─── 14. RLS feed_reactions ──────────────────────────────────
alter table public.feed_reactions enable row level security;

drop policy if exists "feed_reactions public read" on public.feed_reactions;
create policy "feed_reactions public read"
  on public.feed_reactions for select
  using (
    exists (
      select 1 from public.feed_posts fp
      where fp.id = feed_reactions.post_id
        and fp.status = 'approved'
        and fp.removed_at is null
    )
  );

drop policy if exists "feed_reactions insert own approved member" on public.feed_reactions;
create policy "feed_reactions insert own approved member"
  on public.feed_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (public.kigh_is_approved_member() or public.kigh_is_elevated_admin())
    and exists (
      select 1 from public.feed_posts fp
      where fp.id = post_id
        and fp.status = 'approved'
        and fp.removed_at is null
    )
  );

drop policy if exists "feed_reactions delete own" on public.feed_reactions;
create policy "feed_reactions delete own"
  on public.feed_reactions for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "feed_reactions admin manage" on public.feed_reactions;
drop policy if exists "feed_reactions admin select" on public.feed_reactions;
drop policy if exists "feed_reactions admin delete" on public.feed_reactions;

create policy "feed_reactions admin select"
  on public.feed_reactions for select
  to authenticated
  using (public.is_admin());

create policy "feed_reactions admin delete"
  on public.feed_reactions for delete
  to authenticated
  using (public.is_admin());

-- ─── 15. Grants ───────────────────────────────────────────────
grant select on public.feed_posts to anon, authenticated;
grant select on public.feed_comments to anon, authenticated;
grant select on public.feed_reactions to anon, authenticated;

revoke insert, update, delete on public.feed_posts from anon;
revoke insert, update, delete on public.feed_comments from anon;
revoke insert, update, delete on public.feed_reactions from anon;

revoke insert on public.feed_posts from authenticated;
revoke insert on public.feed_comments from authenticated;
grant update, delete on public.feed_posts to authenticated;
grant update, delete on public.feed_comments to authenticated;

grant insert, delete on public.feed_reactions to authenticated;

grant select, insert, update, delete on public.feed_posts to service_role;
grant select, insert, update, delete on public.feed_comments to service_role;
grant select, insert, update, delete on public.feed_reactions to service_role;

grant select, insert, update, delete on public.feed_posts to postgres;
grant select, insert, update, delete on public.feed_comments to postgres;
grant select, insert, update, delete on public.feed_reactions to postgres;

-- ─── 16. Extend create_chat_request (same body as 030 + checks) ─
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

  if public.kigh_contains_blocked_language(v_body) then
    raise exception 'inappropriate_content';
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

-- ─── 17. Triggers: chat_messages moderation ──────────────────
create or replace function public.chat_messages_community_safety_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;
  if new.is_internal_note or new.sender_role is distinct from 'member' then
    return new;
  end if;
  if public.kigh_contains_blocked_language(new.body) then
    raise exception 'inappropriate_content';
  end if;
  return new;
end;
$$;

revoke all on function public.chat_messages_community_safety_guard() from public;

drop trigger if exists chat_messages_community_safety_guard on public.chat_messages;
create trigger chat_messages_community_safety_guard
  before insert on public.chat_messages
  for each row execute function public.chat_messages_community_safety_guard();

-- ─── 18. Triggers: event_comments moderation ─────────────────
create or replace function public.event_comments_community_safety_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;
  if public.kigh_contains_blocked_language(new.body) then
    raise exception 'inappropriate_content';
  end if;
  if public.kigh_contains_sensitive_public_sharing(new.body) then
    raise exception 'private_information_sharing';
  end if;
  return new;
end;
$$;

revoke all on function public.event_comments_community_safety_guard() from public;

drop trigger if exists event_comments_community_safety_guard on public.event_comments;
create trigger event_comments_community_safety_guard
  before insert on public.event_comments
  for each row execute function public.event_comments_community_safety_guard();

-- ─── 19. Triggers: member_invites personal_note ───────────────
create or replace function public.member_invites_note_safety_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n text;
begin
  n := trim(coalesce(new.personal_note, ''));
  if n = '' then
    return new;
  end if;
  if public.kigh_contains_blocked_language(n) then
    raise exception 'inappropriate_content';
  end if;
  if public.kigh_contains_sensitive_public_sharing(n) then
    raise exception 'private_information_sharing';
  end if;
  return new;
end;
$$;

revoke all on function public.member_invites_note_safety_guard() from public;

drop trigger if exists member_invites_note_safety_guard on public.member_invites;
create trigger member_invites_note_safety_guard
  before insert or update on public.member_invites
  for each row execute function public.member_invites_note_safety_guard();

comment on function public.kigh_contains_blocked_language(text) is
  'UAT first-pass profanity / abuse filter; maintain list alongside src/lib/communityModeration.ts.';
