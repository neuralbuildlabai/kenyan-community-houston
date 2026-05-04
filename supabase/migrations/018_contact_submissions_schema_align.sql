-- ============================================================
-- 018 — contact_submissions schema/code drift fix
-- ============================================================
-- The public ContactPage form sends `phone`, `inquiry_type`, and
-- `status`. The original table has `is_read` and `type`. This
-- migration adds the new columns, preserves existing data, and
-- backfills `status`/`inquiry_type` from `is_read`/`type`. We do
-- NOT drop legacy columns; admin code may still read them.
--
-- The table-level RLS already restricts SELECT to admins. We keep
-- INSERT open for anonymous (contact form) but tighten the
-- with-check predicate so spam can be partially mitigated by the
-- DB (status must be in a known set; honeypot prevents most basic
-- bots when combined with the frontend honeypot field).

alter table public.contact_submissions add column if not exists phone text;
alter table public.contact_submissions add column if not exists inquiry_type text;
alter table public.contact_submissions add column if not exists status text not null default 'new';
alter table public.contact_submissions add column if not exists admin_notes text;
alter table public.contact_submissions add column if not exists honeypot text;
alter table public.contact_submissions add column if not exists submitter_ip inet;
alter table public.contact_submissions add column if not exists user_agent text;
alter table public.contact_submissions add column if not exists updated_at timestamptz not null default now();

-- Constrain status to a known set (idempotent).
alter table public.contact_submissions drop constraint if exists contact_submissions_status_check;
alter table public.contact_submissions add constraint contact_submissions_status_check
  check (status in ('new','read','in_progress','replied','archived','spam'));

-- Backfill: legacy `type` -> new `inquiry_type` when blank.
update public.contact_submissions
   set inquiry_type = type::text
 where inquiry_type is null;

-- Backfill: legacy `is_read` -> `status='read'` when blank/new.
update public.contact_submissions
   set status = 'read'
 where status = 'new' and is_read = true;

-- Updated_at trigger.
drop trigger if exists contact_submissions_updated_at on public.contact_submissions;
create trigger contact_submissions_updated_at
  before update on public.contact_submissions
  for each row execute function public.set_updated_at();

-- Keep is_read in sync with status for admin pages still reading is_read.
create or replace function public.contact_submissions_sync_is_read()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from coalesce(old.status, '') then
    new.is_read := new.status not in ('new');
  end if;
  if tg_op = 'INSERT' and new.status is null then
    new.status := 'new';
  end if;
  return new;
end;
$$;

drop trigger if exists contact_submissions_sync_is_read on public.contact_submissions;
create trigger contact_submissions_sync_is_read
  before insert or update on public.contact_submissions
  for each row execute function public.contact_submissions_sync_is_read();

-- Tighten public insert policy.
drop policy if exists "Anyone can submit contact forms" on public.contact_submissions;
create policy "Anyone can submit contact forms"
  on public.contact_submissions for insert
  with check (
    -- new rows must come in clean; reject obvious spam markers.
    coalesce(status, 'new') in ('new')
    and coalesce(honeypot, '') = ''
    and char_length(coalesce(name, '')) between 1 and 200
    and char_length(coalesce(email, '')) between 3 and 320
    and char_length(coalesce(message, '')) between 1 and 10000
  );

-- Make sure SELECT is admin-only (idempotent re-create).
drop policy if exists "Admins can read contacts" on public.contact_submissions;
create policy "Admins can read contacts"
  on public.contact_submissions for select
  using (public.kigh_is_elevated_admin());

drop policy if exists "Admins can manage contacts" on public.contact_submissions;
create policy "Admins can manage contacts"
  on public.contact_submissions for all
  using (public.kigh_is_elevated_admin())
  with check (public.kigh_is_elevated_admin());

create index if not exists contact_submissions_status_idx on public.contact_submissions (status);
create index if not exists contact_submissions_inquiry_type_idx on public.contact_submissions (inquiry_type);
