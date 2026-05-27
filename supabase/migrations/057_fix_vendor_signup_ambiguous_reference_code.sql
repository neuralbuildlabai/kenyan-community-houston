-- ============================================================
-- 057 — Fix ambiguous "reference_code" in create_event_vendor_signup
-- ============================================================
-- Production error (May 2026, vendor signup at
-- /events/kigh-family-fun-day-2026/vendor):
--
--   column reference "reference_code" is ambiguous
--
-- Cause:
--   Migration 051 added a `reference_code` column to
--   public.event_vendor_signups AND added a `reference_code` OUT
--   parameter to the create_event_vendor_signup() function with
--   the same name. The function body ends with:
--
--     insert into public.event_vendor_signups (...) values (...)
--     returning id, reference_code into v_id, v_code;
--
--   Postgres cannot tell whether `reference_code` in the
--   RETURNING clause means the inserted-row column or the
--   function-level OUT variable, so it raises 42702 at runtime.
--
-- Fix:
--   Qualify the column reference with the table name in
--   RETURNING. Pure body fix — function signature, GRANTs, and
--   trigger are untouched.
-- ============================================================

create or replace function public.create_event_vendor_signup(
  p_event_id uuid,
  p_business_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_vendor_category text,
  p_product_description text default null
) returns table (
  signup_id uuid,
  fee_amount_cents integer,
  vendor_category text,
  reference_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
  v_event record;
  v_business text := trim(coalesce(p_business_name, ''));
  v_contact text := trim(coalesce(p_contact_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := public.kigh_normalize_volunteer_phone(p_phone);
  v_category text := lower(trim(coalesce(p_vendor_category, '')));
  v_description text := nullif(trim(coalesce(p_product_description, '')), '');
  v_uid uuid := auth.uid();
  v_fee_cents integer;
begin
  if v_business is null or char_length(v_business) < 2 or char_length(v_business) > 200 then
    raise exception 'business_name_required' using errcode = 'P0001';
  end if;

  if v_contact is null or char_length(v_contact) < 2 or char_length(v_contact) > 120 then
    raise exception 'contact_name_required' using errcode = 'P0001';
  end if;

  if v_email is null or v_email !~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  if v_phone is null or v_phone = '' or v_phone !~ '^\+?[0-9]{7,15}$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  if v_category not in ('food', 'other') then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  if v_description is not null and char_length(v_description) > 500 then
    raise exception 'invalid_description' using errcode = 'P0001';
  end if;

  if v_description is not null and (
    public.kigh_contains_blocked_language(v_description)
    or public.kigh_contains_sensitive_public_sharing(v_description)
  ) then
    raise exception 'invalid_description' using errcode = 'P0001';
  end if;

  if v_business is not null and public.kigh_contains_blocked_language(v_business) then
    raise exception 'invalid_business_name' using errcode = 'P0001';
  end if;

  select
    e.id,
    e.status,
    e.vendor_signup_enabled,
    e.vendor_signup_closes_at,
    e.vendor_food_fee_cents,
    e.vendor_other_fee_cents
  into v_event
  from public.events e
  where e.id = p_event_id;

  if v_event.id is null then
    raise exception 'vendor_signup_not_enabled' using errcode = 'P0001';
  end if;

  if v_event.status is distinct from 'published' then
    raise exception 'vendor_signup_not_enabled' using errcode = 'P0001';
  end if;

  if not coalesce(v_event.vendor_signup_enabled, false) then
    raise exception 'vendor_signup_not_enabled' using errcode = 'P0001';
  end if;

  if v_event.vendor_signup_closes_at is not null
     and v_event.vendor_signup_closes_at <= now() then
    raise exception 'vendor_signup_closed' using errcode = 'P0001';
  end if;

  v_fee_cents := case
    when v_category = 'food' then coalesce(v_event.vendor_food_fee_cents, 10000)
    else coalesce(v_event.vendor_other_fee_cents, 5000)
  end;

  insert into public.event_vendor_signups as evs (
    event_id,
    user_id,
    business_name,
    contact_name,
    email,
    phone,
    vendor_category,
    product_description,
    fee_amount_cents,
    payment_status,
    status
  ) values (
    p_event_id,
    v_uid,
    v_business,
    v_contact,
    v_email,
    v_phone,
    v_category,
    v_description,
    v_fee_cents,
    'unpaid',
    'submitted'
  )
  returning evs.id, evs.reference_code into v_id, v_code;

  return query select v_id, v_fee_cents, v_category, v_code;
exception
  when unique_violation then
    raise exception 'duplicate_signup' using errcode = 'P0001';
end;
$$;
