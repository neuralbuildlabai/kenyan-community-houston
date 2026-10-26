import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/091_volunteer_confirmation_emails.sql'),
  'utf8'
)
const page = readFileSync(resolve(process.cwd(), 'src/pages/admin/AdminVolunteersPage.tsx'), 'utf8')

describe('migration 091 volunteer emails', () => {
  it('emails the volunteer the moment they are confirmed', () => {
    expect(sql).toContain('after insert or update of status on public.event_volunteer_signups')
    expect(sql).toContain("new.status = 'confirmed'")
    expect(sql).toContain("perform public.kigh_send_volunteer_email(new.id, 'confirmation')")
  })

  it('includes the event WhatsApp group as a button when one is saved', () => {
    expect(sql).toContain('from public.event_whatsapp_groups where event_id = s.event_id')
    expect(sql).toContain("'Join the volunteer WhatsApp group'")
  })

  it('never emails volunteers confirmed before the migration', () => {
    // confirmed_at is only stamped on a status change from now on, and both
    // the retry and the reminder require it.
    expect(sql).toContain('new.confirmed_at := now();')
    expect(sql.match(/v\.confirmed_at is not null/g)).toHaveLength(2)
    expect(sql).not.toMatch(/update public\.event_volunteer_signups\s+set confirmed_at/)
    expect(sql).toContain('and e.start_date >= v_today')
  })

  it('reminds once, 1-3 days out, at 9am Houston time', () => {
    expect(sql).toContain('e.start_date between v_today + 1 and v_today + 3')
    expect(sql).toContain('v_hour = 9')
    expect(sql).toContain('v.reminder_emailed_at is null')
  })

  it('stays under the Resend rate limit and retries only busy failures', () => {
    expect(sql).toContain('perform pg_sleep(0.6)')
    expect(sql).toContain('e.status_code = 429 or e.status_code >= 500')
  })

  it('keeps the resend function admin-only', () => {
    expect(sql).toContain('revoke all on function public.kigh_admin_send_volunteer_email(uuid, text) from public, anon;')
    expect(sql).toContain('revoke all on function public.kigh_send_volunteer_email(uuid, text) from public, anon, authenticated;')
  })
})

describe('admin volunteers page', () => {
  it('shows when the confirmation went out and can resend it', () => {
    expect(page).toContain('confirmation_emailed_at')
    expect(page).toContain("supabase.rpc('kigh_admin_send_volunteer_email'")
  })
})
