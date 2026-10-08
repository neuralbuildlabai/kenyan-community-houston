import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/085_fundraiser_collections_ledger.sql'),
  'utf8'
)

describe('migration 085 fundraiser collections ledger', () => {
  it('creates the ledger with an audit trail of who touched each record', () => {
    expect(sql).toContain('create table if not exists public.fundraiser_collections')
    expect(sql).toContain('created_by      uuid references auth.users (id) on delete set null')
    expect(sql).toContain('updated_by      uuid references auth.users (id) on delete set null')
    expect(sql).toContain('fundraiser_collections_audit')
    expect(sql).toContain("'fundraiser_collection.created'")
    expect(sql).toContain("'fundraiser_collection.updated'")
    expect(sql).toContain("'fundraiser_collection.deleted'")
    expect(sql).toContain('public.kigh_record_audit(')
  })

  it('stamps the acting admin from the session rather than the payload', () => {
    expect(sql).toContain('kigh_stamp_fundraiser_collection_actor')
    expect(sql).toContain('new.created_by := auth.uid()')
    expect(sql).toContain('new.created_by := old.created_by')
  })

  it('validates money and descriptions server-side', () => {
    expect(sql).toContain('fundraiser_collections_amount_positive check (amount > 0)')
    expect(sql).toContain('amount          numeric(12,2) not null')
    expect(sql).toContain('fundraiser_collections_description_len')
    expect(sql).toContain("entry_type in ('individual', 'batch')")
  })

  it('keeps donors anonymous unless an admin publishes the name', () => {
    expect(sql).toContain('show_donor_name boolean not null default false')
    expect(sql).toContain('public_donor_name text generated always as')
    expect(sql).toContain('case when show_donor_name then nullif(btrim(donor_name), \'\') end')
    expect(sql).toContain('fundraiser_collections_named_donor_chk')
  })

  it('never grants anon or authenticated the private columns', () => {
    // `revoke all` matters: Supabase default privileges would otherwise
    // leave anon holding INSERT/UPDATE/DELETE on a brand new table.
    expect(sql).toContain('revoke all on public.fundraiser_collections from anon')
    expect(sql).toContain('revoke all on public.fundraiser_collections from authenticated')
    expect(sql).not.toContain('grant insert, update, delete on public.fundraiser_collections to anon')
    const grant = sql.slice(
      sql.indexOf('grant select ('),
      sql.indexOf('on public.fundraiser_collections to anon, authenticated;')
    )
    expect(grant).toContain('public_donor_name')
    expect(grant).not.toContain('private_note')
    expect(grant).not.toMatch(/\bdonor_name\b(?!.*public_donor_name)/)
  })

  it('hides the ledger of anything that is not published', () => {
    expect(sql).toContain('"fundraiser_collections public select"')
    expect(sql).toContain("and f.status = 'published'")
  })

  it('restricts every mutation to elevated admins', () => {
    expect(sql).toContain('"fundraiser_collections elevated admin all"')
    expect(sql).toContain('using (public.kigh_is_elevated_admin())')
    expect(sql).toContain('with check (public.kigh_is_elevated_admin())')
  })

  it('gates the admin read on the database, not on the caller being an admin page', () => {
    expect(sql).toContain('function public.kigh_admin_fundraiser_collections(p_fundraiser_id uuid)')
    expect(sql).toContain('if not public.kigh_is_elevated_admin() then')
    expect(sql).toContain("raise exception 'collections_forbidden'")
    expect(sql).toContain(
      'revoke all on function public.kigh_admin_fundraiser_collections(uuid) from public'
    )
  })

  it('derives raised_amount from the ledger instead of letting it be typed', () => {
    expect(sql).toContain('kigh_sync_fundraiser_collected')
    expect(sql).toContain('set raised_amount = coalesce(')
    expect(sql).toContain('collections_updated_at = now()')
    expect(sql).toContain('after insert or update or delete on public.fundraiser_collections')
  })

  it('keeps publication, donation availability and goal status independent', () => {
    expect(sql).toContain('add column if not exists donations_closed boolean not null default false')
    expect(sql).toContain(
      'add column if not exists is_homepage_featured boolean not null default false'
    )
    // Defaults mean existing fundraisers keep behaving exactly as before.
    expect(sql).toContain('add column if not exists payment_reference text')
    expect(sql).not.toMatch(/update public\.fundraisers[\s\S]{0,200}set status/)
  })

  it('is idempotent on re-run', () => {
    expect(sql).toContain('create table if not exists')
    expect(sql).toContain('drop trigger if exists fundraiser_collections_sync_total')
    expect(sql).toContain('drop trigger if exists fundraiser_collections_audit')
    expect(sql).toContain('drop policy if exists "fundraiser_collections public select"')
    expect(sql).toContain('drop constraint if exists fundraisers_payment_reference_len')
  })
})
