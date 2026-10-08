-- ============================================================
-- 085 — Fundraiser collections ledger (manual, admin-tallied)
-- ============================================================
-- KIGH collects donations through Cash App / Venmo / PayPal handles and
-- in person. Nothing reports back to this site, so "how much have we
-- raised" has always been a number somebody typed into
-- `fundraisers.raised_amount` by hand — with no record of where it came
-- from and nothing stopping it from drifting.
--
-- This replaces that single number with a ledger. One row per confirmed
-- receipt (or per clearly-labelled batch of receipts); the public total,
-- progress bar, remaining balance, and goal status are all derived from
-- the same rows, so they cannot disagree with each other or with the
-- table printed underneath them.
--
-- `fundraisers.raised_amount` survives as a trigger-maintained mirror of
-- the ledger sum. Nothing writes it by hand any more, so it is a cache
-- rather than a competing source of truth, and the listing cards and
-- admin table that already read it keep working untouched. Fundraisers
-- that predate the ledger keep whatever figure they were last given.
--
-- Three things are deliberately NOT in here:
--
--   * Pledges. Only money actually in hand is a collection. There is no
--     "expected" or "promised" state to tempt anyone into counting it.
--   * A publication side effect. Publishing, approving, closing
--     donations, and reaching the goal are four independent states.
--     Hitting the target must not take a page offline or hide the
--     handles — a donor arriving late still gets to give.
--   * Sample data. A fundraiser with no ledger rows reads $0 collected.

-- ─── fundraisers: publication-independent controls ──────────
-- All four are public-safe and reach anon through the table-wide select
-- grant migration 043 already gave it. That grant also still exposes
-- `organizer_contact`; narrowing it to columns is worth doing, but it
-- would break any deployed build still asking for `select=*`, so it
-- needs to ship after the client stops doing that — not here.
alter table public.fundraisers
  add column if not exists donations_closed boolean not null default false;

alter table public.fundraisers
  add column if not exists is_homepage_featured boolean not null default false;

alter table public.fundraisers
  add column if not exists payment_reference text;

alter table public.fundraisers
  add column if not exists collections_updated_at timestamptz;

comment on column public.fundraisers.donations_closed is
  'Admin has explicitly stopped accepting donations. Independent of status and of whether the goal was reached — a funded fundraiser keeps its donation options until an admin closes them here.';
comment on column public.fundraisers.is_homepage_featured is
  'Admin opted this fundraiser into the homepage card. Only honoured while status = published; the homepage query enforces that so unfeaturing is never the only thing standing between a draft and the front page.';
comment on column public.fundraisers.payment_reference is
  'Short token donors are asked to put in their payment note ("AfriFest"). Falls back to the fundraiser title when null.';
comment on column public.fundraisers.collections_updated_at is
  'When the collection ledger last changed. Drives the public "updated manually by KIGH" timestamp, and survives a deletion in a way that max(updated_at) over surviving rows would not.';

alter table public.fundraisers drop constraint if exists fundraisers_payment_reference_len;
alter table public.fundraisers
  add constraint fundraisers_payment_reference_len check (
    payment_reference is null or char_length(btrim(payment_reference)) between 1 and 60
  );

-- ─── fundraiser_collections ─────────────────────────────────
create table if not exists public.fundraiser_collections (
  id              uuid primary key default gen_random_uuid(),
  fundraiser_id   uuid not null references public.fundraisers (id) on delete cascade,
  received_on     date not null,
  amount          numeric(12,2) not null,
  -- Shown publicly in the Source / description column: "Cash App
  -- collections", "Business contribution".
  description     text not null,
  entry_type      text not null default 'individual',
  -- Anonymous by default. A name only becomes public when an admin
  -- ticks the box, and the generated column below is what anon can read
  -- — the raw name never leaves the admin surface otherwise.
  donor_name      text,
  show_donor_name boolean not null default false,
  public_donor_name text generated always as (
    case when show_donor_name then nullif(btrim(donor_name), '') end
  ) stored,
  -- Reconciliation detail: transaction references, who to chase, which
  -- deposit this landed in. Never granted to anon.
  private_note    text,
  created_by      uuid references auth.users (id) on delete set null,
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Money only. Zero is not a collection and a negative "collection" is
  -- a correction, which belongs in an edit to the original row.
  constraint fundraiser_collections_amount_positive check (amount > 0),
  constraint fundraiser_collections_description_len check (
    char_length(btrim(description)) between 2 and 160
  ),
  constraint fundraiser_collections_entry_type_chk check (
    entry_type in ('individual', 'batch')
  ),
  constraint fundraiser_collections_donor_name_len check (
    donor_name is null or char_length(btrim(donor_name)) between 2 and 120
  ),
  -- Publishing a blank name would render an empty cell that looks like a
  -- bug; ask for the name or leave the row anonymous.
  constraint fundraiser_collections_named_donor_chk check (
    not show_donor_name or nullif(btrim(coalesce(donor_name, '')), '') is not null
  ),
  constraint fundraiser_collections_private_note_len check (
    private_note is null or char_length(private_note) <= 500
  )
);

comment on table public.fundraiser_collections is
  'Confirmed funds received for a fundraiser, tallied manually by KIGH admins. Source of truth for the public collected total, progress, remaining balance and goal status — see migration 085. Pledges and unconfirmed payments do not belong here.';
comment on column public.fundraiser_collections.entry_type is
  'individual = one donation. batch = a labelled group of confirmed receipts banked together ("Cash App collections, Oct 1-7").';
comment on column public.fundraiser_collections.public_donor_name is
  'Generated. The donor name only when the admin chose to display it, so anon can be granted this column without ever reaching donor_name.';
comment on column public.fundraiser_collections.private_note is
  'Internal reconciliation note. Admin-only: anon has no grant on this column and the public page never requests it.';

create index if not exists fundraiser_collections_fundraiser_idx
  on public.fundraiser_collections (fundraiser_id, received_on, created_at);

drop trigger if exists fundraiser_collections_updated_at on public.fundraiser_collections;
create trigger fundraiser_collections_updated_at
  before update on public.fundraiser_collections
  for each row execute function public.set_updated_at();

-- ─── Actor stamping ─────────────────────────────────────────
-- created_by / updated_by are filled from the session rather than the
-- payload, so the audit trail records who actually made the call and a
-- crafted request cannot attribute an edit to somebody else.
create or replace function public.kigh_stamp_fundraiser_collection_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.updated_by := coalesce(auth.uid(), old.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists fundraiser_collections_stamp_actor on public.fundraiser_collections;
create trigger fundraiser_collections_stamp_actor
  before insert or update on public.fundraiser_collections
  for each row execute function public.kigh_stamp_fundraiser_collection_actor();

-- ─── Derived total on the parent fundraiser ─────────────────
-- Recomputed from the ledger, never incremented, so a failed or
-- replayed statement cannot leave the mirror out of step.
create or replace function public.kigh_sync_fundraiser_collected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_old_id uuid;
begin
  if tg_op <> 'DELETE' then v_new_id := new.fundraiser_id; end if;
  if tg_op <> 'INSERT' then v_old_id := old.fundraiser_id; end if;

  -- A row that moved between fundraisers has to settle both sides.
  update public.fundraisers f
     set raised_amount = coalesce(
           (select sum(c.amount) from public.fundraiser_collections c
             where c.fundraiser_id = f.id),
           0
         ),
         collections_updated_at = now()
   where f.id in (v_new_id, v_old_id);

  return null;
end;
$$;

drop trigger if exists fundraiser_collections_sync_total on public.fundraiser_collections;
create trigger fundraiser_collections_sync_total
  after insert or update or delete on public.fundraiser_collections
  for each row execute function public.kigh_sync_fundraiser_collected();

-- ─── Audit trail ────────────────────────────────────────────
-- Money moved on a public page: every add, change and removal is
-- recorded in audit_logs with the acting admin. Deletions capture the
-- row's final state, which is the only place it still exists.
create or replace function public.kigh_audit_fundraiser_collection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_id uuid;
  v_fundraiser_id uuid;
  v_metadata jsonb;
begin
  if tg_op = 'DELETE' then
    v_action := 'fundraiser_collection.deleted';
    v_id := old.id;
    v_fundraiser_id := old.fundraiser_id;
    v_metadata := jsonb_build_object(
      'received_on', old.received_on,
      'description', old.description,
      'entry_type', old.entry_type,
      'amount', old.amount
    );
  else
    v_action := case tg_op
      when 'INSERT' then 'fundraiser_collection.created'
      else 'fundraiser_collection.updated'
    end;
    v_id := new.id;
    v_fundraiser_id := new.fundraiser_id;
    v_metadata := jsonb_build_object(
      'received_on', new.received_on,
      'description', new.description,
      'entry_type', new.entry_type,
      'amount', new.amount
    );
    if tg_op = 'UPDATE' then
      v_metadata := v_metadata || jsonb_build_object(
        'previous_received_on', old.received_on,
        'previous_description', old.description,
        'previous_amount', old.amount
      );
    end if;
  end if;

  perform public.kigh_record_audit(
    v_action,
    'fundraiser_collections',
    v_id,
    (select f.community_id from public.fundraisers f where f.id = v_fundraiser_id),
    v_metadata || jsonb_build_object('fundraiser_id', v_fundraiser_id)
  );
  return null;
end;
$$;

drop trigger if exists fundraiser_collections_audit on public.fundraiser_collections;
create trigger fundraiser_collections_audit
  after insert or update or delete on public.fundraiser_collections
  for each row execute function public.kigh_audit_fundraiser_collection();

-- ─── RLS ────────────────────────────────────────────────────
alter table public.fundraiser_collections enable row level security;

-- Visitors read the ledger of a published fundraiser and nothing else.
-- A draft, pending, rejected or archived fundraiser's collections stay
-- invisible along with its page.
drop policy if exists "fundraiser_collections public select" on public.fundraiser_collections;
create policy "fundraiser_collections public select"
  on public.fundraiser_collections for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.fundraisers f
       where f.id = fundraiser_id
         and f.status = 'published'
    )
  );

drop policy if exists "fundraiser_collections elevated admin all" on public.fundraiser_collections;
create policy "fundraiser_collections elevated admin all"
  on public.fundraiser_collections for all
  to authenticated
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

-- ─── Grants ─────────────────────────────────────────────────
-- Column grants, not a table grant: `donor_name` and `private_note` must
-- stay unreachable, and a table-wide grant covers every column including
-- ones added later and cannot be narrowed afterwards (migration 077).
-- Signed-in visitors get exactly the same columns as anonymous ones —
-- holding an account is not a reason to see a reconciliation note.
-- Start from nothing. Supabase's default privileges hand `anon` and
-- `authenticated` every privilege on each new table in `public`, so a
-- fresh table arrives with anon already holding INSERT, UPDATE, DELETE and
-- TRUNCATE. RLS denies all of it (anon has no policy that permits a write),
-- but a ledger of public money should not be relying on one layer.
revoke all on public.fundraiser_collections from anon;
revoke all on public.fundraiser_collections from authenticated;
revoke all on public.fundraiser_collections from public;

grant select (
  id, fundraiser_id, received_on, amount, description, entry_type,
  public_donor_name, created_at, updated_at
) on public.fundraiser_collections to anon, authenticated;

-- Writes are gated by the admin policy above; admins read the private
-- columns through kigh_admin_fundraiser_collections below.
grant insert, update, delete on public.fundraiser_collections to authenticated;
grant select, insert, update, delete on public.fundraiser_collections to service_role;

-- ─── Admin read (SECURITY DEFINER) ──────────────────────────
-- The only way to the private columns, and it checks the caller rather
-- than trusting the client to ask nicely.
create or replace function public.kigh_admin_fundraiser_collections(p_fundraiser_id uuid)
returns table (
  id uuid,
  fundraiser_id uuid,
  received_on date,
  amount numeric,
  description text,
  entry_type text,
  donor_name text,
  show_donor_name boolean,
  private_note text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.kigh_is_elevated_admin() then
    raise exception 'collections_forbidden' using errcode = 'P0001';
  end if;

  return query
    select c.id, c.fundraiser_id, c.received_on, c.amount, c.description,
           c.entry_type, c.donor_name, c.show_donor_name, c.private_note,
           c.created_by, c.updated_by, c.created_at, c.updated_at
      from public.fundraiser_collections c
     where c.fundraiser_id = p_fundraiser_id
     order by c.received_on asc, c.created_at asc;
end;
$$;

revoke all on function public.kigh_admin_fundraiser_collections(uuid) from public;
grant execute on function public.kigh_admin_fundraiser_collections(uuid) to authenticated;

comment on function public.kigh_admin_fundraiser_collections(uuid) is
  'Full collection rows, including donor_name and private_note, for elevated admins only. Raises collections_forbidden otherwise. Public surfaces read the table directly and are limited to the granted columns.';
