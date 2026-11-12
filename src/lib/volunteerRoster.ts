import { outreachPhoneDigits } from '@/lib/contactOutreach'

/**
 * Volunteer Roster: one row per PERSON across every event signup (and,
 * optionally, Call to Serve submissions), so KIGH can invite past
 * volunteers back.
 *
 * Who counts as the same person:
 *   1. Same email (case-insensitive). Email is required on signups from
 *      migration 094, and people often use more than one phone, so email
 *      is the identity — different phones under one email are one person.
 *   2. A signup with no email (made before 094) joins the email-person who
 *      used the same phone, but only when exactly one such person exists:
 *      a phone shared by two emails (family phone) is ambiguous, so it is
 *      not merged.
 *   3. Otherwise no-email signups sharing a phone are grouped by phone.
 */

export type RosterSource = 'event' | 'serve'

export type RosterRecord = {
  source: RosterSource
  id: string
  full_name: string
  phone: string | null
  email: string | null
  role: string | null
  /** ISO timestamp the signup / submission was made. */
  submitted_at: string
  /** Event signups only. */
  event_id: string | null
  event_title: string | null
  /** Event start date (YYYY-MM-DD), for the history list. */
  event_date: string | null
  status: string | null
  /** Agreed KIGH may contact them about future volunteer opportunities. */
  recontact_ok: boolean
  note: string | null
}

export type RosterPerson = {
  key: string
  /** Name from their most recent record. */
  name: string
  emails: string[]
  /** Normalized digits-with-plus, most recent first. */
  phones: string[]
  records: RosterRecord[]
  /** Distinct events they signed up for and did not cancel / get declined. */
  eventIds: string[]
  roles: string[]
  lastActive: string
  firstActive: string
  recontactOk: boolean
  fromServe: boolean
}

/** Statuses that mean the person did not actually take part. */
const INACTIVE_STATUSES = new Set(['cancelled', 'declined'])

function emailKey(email: string | null): string | null {
  const e = email?.trim().toLowerCase()
  return e ? e : null
}

function phoneKey(phone: string | null): string | null {
  return outreachPhoneDigits(phone)
}

export function buildVolunteerRoster(records: RosterRecord[]): RosterPerson[] {
  const groups = new Map<string, RosterRecord[]>()
  const add = (key: string, r: RosterRecord) => {
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }

  // Pass 1: everyone with an email, and which emails each phone appears under.
  const phoneToEmails = new Map<string, Set<string>>()
  const noEmail: RosterRecord[] = []
  for (const r of records) {
    const ek = emailKey(r.email)
    if (!ek) {
      noEmail.push(r)
      continue
    }
    add(`email:${ek}`, r)
    const pk = phoneKey(r.phone)
    if (pk) {
      const set = phoneToEmails.get(pk) ?? new Set<string>()
      set.add(ek)
      phoneToEmails.set(pk, set)
    }
  }

  // Pass 2: older no-email signups attach by phone when unambiguous.
  for (const r of noEmail) {
    const pk = phoneKey(r.phone)
    if (!pk) {
      add(`record:${r.source}:${r.id}`, r)
      continue
    }
    const emails = phoneToEmails.get(pk)
    if (emails && emails.size === 1) add(`email:${[...emails][0]}`, r)
    else add(`phone:${pk}`, r)
  }

  const people: RosterPerson[] = []
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    const emails: string[] = []
    const phones: string[] = []
    const eventIds: string[] = []
    const roles: string[] = []
    const seenEmail = new Set<string>()
    const seenPhone = new Set<string>()
    for (const r of sorted) {
      const ek = emailKey(r.email)
      if (ek && !seenEmail.has(ek)) {
        seenEmail.add(ek)
        emails.push(r.email!.trim())
      }
      const pk = phoneKey(r.phone)
      if (pk && !seenPhone.has(pk)) {
        seenPhone.add(pk)
        phones.push(`+${pk}`)
      }
      if (r.source === 'event' && r.event_id && !INACTIVE_STATUSES.has(r.status ?? '') && !eventIds.includes(r.event_id)) {
        eventIds.push(r.event_id)
      }
      const role = r.role?.trim()
      if (role && !roles.includes(role)) roles.push(role)
    }
    people.push({
      key,
      name: sorted[0].full_name.trim(),
      emails,
      phones,
      records: sorted,
      eventIds,
      roles,
      lastActive: sorted[0].submitted_at,
      firstActive: sorted[sorted.length - 1].submitted_at,
      recontactOk: sorted.some((r) => r.recontact_ok),
      fromServe: sorted.some((r) => r.source === 'serve'),
    })
  }

  return people.sort((a, b) => b.lastActive.localeCompare(a.lastActive))
}

/**
 * The event signup form stores "Individual volunteer — Tech / Zoom support"
 * style labels (participation type + role; see buildSignupRoleAndNote).
 * The roster role filter offers the distinct labels as stored.
 */
export function rosterRoleOptions(people: RosterPerson[]): string[] {
  const set = new Set<string>()
  for (const p of people) for (const r of p.roles) set.add(r)
  return [...set].sort((a, b) => a.localeCompare(b))
}
