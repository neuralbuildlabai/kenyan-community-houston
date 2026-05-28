-- ============================================================
-- 058 — Public vendor list for the event detail page
-- ============================================================
-- Need:
--   Attendees should see which vendors will be at an event. The
--   admin Vendors page already supports a "cancelled" status (soft
--   removal). What's missing is a public read path that exposes
--   ONLY non-PII columns of CONFIRMED vendors.
--
-- Design:
--   * New SECURITY DEFINER function `public_event_vendor_list`
--     returns `(business_name, vendor_category, product_description)`
--     for status = 'confirmed' rows on a published, vendor-enabled
--     event. Cancelled, declined, submitted, and waitlisted rows
--     are filtered out so only admin-confirmed vendors appear.
--   * PII (email, phone, contact_name, reference_code,
--     fee_amount_cents, payment_status, submitted_at) is never in
--     the projection. Even if a future caller queried via PostgREST
--     with `select=*`, those columns are simply not returned.
--   * Anon + authenticated may execute. Internal aggregate is run
--     as SECURITY DEFINER so the function can read past
--     event_vendor_signups RLS (which only allows admin/self read
--     of the base table).
--   * Public ordering: business_name asc within category so the
--     list is stable and not skewed by signup timing.
--
-- Privacy posture:
--   public_event_vendor_signup_count (migration 050) already
--   exposes a confirmation-status-aware aggregate count. This RPC
--   adds names — a small step in visibility that vendors implicitly
--   accept by being public-facing businesses. Contact info stays
--   admin-only.
-- ============================================================

create or replace function public.public_event_vendor_list(p_event_slug text)
returns table (
  business_name text,
  vendor_category text,
  product_description text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  -- Resolve the slug to an id, only for published vendor-enabled events.
  select e.id into v_event_id
  from public.events e
  where e.slug = p_event_slug
    and e.status = 'published'
    and coalesce(e.vendor_signup_enabled, false)
  limit 1;

  if v_event_id is null then
    return;
  end if;

  return query
    select
      s.business_name,
      s.vendor_category,
      s.product_description
    from public.event_vendor_signups s
    where s.event_id = v_event_id
      and s.status = 'confirmed'
    order by s.vendor_category asc, lower(s.business_name) asc;
end;
$$;

comment on function public.public_event_vendor_list(text) is
  'Returns the public-safe vendor roster (business_name, category, '
  'description) for status=confirmed signups on a published, '
  'vendor-enabled event. PII columns (email/phone/contact/ref code/fee/payment) '
  'are never projected. Used by the public event detail page (migration 058).';

revoke all on function public.public_event_vendor_list(text) from public;
grant execute on function public.public_event_vendor_list(text) to anon, authenticated;
