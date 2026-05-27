-- ============================================================
-- 053 — Lint hardening: function search_path, pg_trgm schema,
--       service_interests insert tightening
-- ============================================================
-- Addresses the following Supabase WARN-level findings:
--
--   * function_search_path_mutable  (6 functions)
--       set_updated_at, contact_submissions_sync_is_read,
--       kigh_is_valid_general_location_area,
--       kigh_is_valid_professional_field,
--       kigh_professional_other_ok, kigh_leadership_titles_ok
--
--   * extension_in_public  (pg_trgm)
--       Extension was created in the public schema. Best practice
--       is to keep extensions in their own schema so the operators
--       and indexes don't leak into PostgREST API surface.
--
--   * rls_policy_always_true  (service_interests INSERT)
--       The current INSERT policy is `WITH CHECK (true)` which
--       lets anon submit arbitrary payloads. Tighten the CHECK
--       to require non-empty name/email and reasonable lengths.
--       This is shape-validation, not anti-spam (use a captcha
--       at the application layer for that), but it does close
--       the lint and reject malformed payloads at the DB.
--
-- All changes are additive / idempotent.
-- ============================================================

-- ─── 1. search_path hardening ────────────────────────────────────
-- ALTER FUNCTION ... SET search_path locks the schema lookup path
-- so a malicious user cannot create a same-named object in a schema
-- earlier on the path to shadow the intended reference. Each
-- function was previously created without `set search_path`.

alter function public.set_updated_at()
  set search_path = public;

alter function public.contact_submissions_sync_is_read()
  set search_path = public;

alter function public.kigh_is_valid_general_location_area(text)
  set search_path = public;

alter function public.kigh_is_valid_professional_field(text)
  set search_path = public;

alter function public.kigh_professional_other_ok(text, text)
  set search_path = public;

alter function public.kigh_leadership_titles_ok(text[])
  set search_path = public;

-- ─── 2. pg_trgm out of public ────────────────────────────────────
-- Move pg_trgm to the `extensions` schema (Supabase's convention).
-- The schema is created if it does not exist. Existing indexes that
-- reference the gin_trgm_ops / gist_trgm_ops operator classes will
-- continue to work because the dependency is on the operator class
-- by name lookup at plan time and the search_path is updated below.
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- Postgres supports `ALTER EXTENSION ... SET SCHEMA` for relocatable
-- extensions; pg_trgm is relocatable. If the extension is already in
-- `extensions` (e.g. dev project), this is a no-op + raises NOTICE.
do $$
declare
  current_schema text;
begin
  select n.nspname into current_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if current_schema is null then
    -- Extension not installed — install in extensions schema.
    create extension pg_trgm with schema extensions;
  elsif current_schema <> 'extensions' then
    -- Relocate.
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$$;

-- Add `extensions` to the database-default search_path so unqualified
-- operator references (e.g. `text % text`) keep working.
-- This statement requires superuser/role-owner privileges; Supabase
-- service-role migrations have it.
do $$
declare
  db_name text := current_database();
  existing_path text;
begin
  select setting into existing_path
  from pg_db_role_setting drs
  join pg_database db on db.oid = drs.setdatabase
  where db.datname = db_name
    and drs.setrole = 0
  limit 1;

  -- Only update if `extensions` is not already on the search_path.
  if existing_path is null or position('extensions' in existing_path) = 0 then
    execute format('alter database %I set search_path = "$user", public, extensions', db_name);
  end if;
end
$$;

-- ─── 3. service_interests: shape-validated INSERT policy ─────────
-- Replace the always-true INSERT policy with a CHECK that enforces
-- non-empty name + email shape and caps free-text fields at 2000
-- chars so a malicious caller can't store huge blobs. Real abuse
-- prevention belongs at the application/edge layer (rate limit +
-- captcha) — the DB CHECK is a backstop.
drop policy if exists "Anyone can insert service interest"
  on public.service_interests;

create policy "Anyone can insert service interest"
  on public.service_interests for insert
  with check (
    coalesce(trim(full_name), '') <> ''
    and char_length(trim(full_name)) between 1 and 200
    and coalesce(trim(email), '') <> ''
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and char_length(email) <= 320  -- RFC 5321 cap
    and coalesce(char_length(phone), 0) <= 40
    and coalesce(char_length(area_of_interest), 0) <= 2000
    and coalesce(char_length(how_to_help), 0) <= 2000
    and coalesce(char_length(skills_experience), 0) <= 2000
    and coalesce(char_length(notes), 0) <= 2000
  );

comment on policy "Anyone can insert service interest" on public.service_interests is
  'Anyone (incl. anon) may submit, but payload shape is validated: '
  'non-empty trimmed name, RFC-shaped email, free-text fields capped '
  'at 2000 chars. Real abuse prevention is at the app layer '
  '(migration 053; closes lint 0024_permissive_rls_policy).';
