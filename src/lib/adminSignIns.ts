/**
 * Shapes and labels for /admin/sign-ins.
 *
 * Data comes from the `kigh_admin_sign_ins` and `kigh_admin_sign_in_activity`
 * RPCs (migration 078), which read `public.analytics_events`.
 */

export type SignInRow = {
  id: string
  occurred_at: string
  kind: string
  user_id: string | null
  session_id: string | null
  entry_path: string | null
  email: string | null
  full_name: string | null
  role: string | null
  member_first_name: string | null
  member_last_name: string | null
  membership_status: string | null
  event_count: number
  page_views: number
  distinct_paths: number
  last_event_at: string | null
}

export type SignInSummary = {
  total: number
  unique_users: number
  admin_logins: number
  member_logins: number
  unidentified: number
}

export type SignInsPayload = {
  period_days: number
  period_from: string
  generated_at: string
  summary: SignInSummary
  rows: SignInRow[]
}

export type SignInActivityRow = {
  id: string
  occurred_at: string
  event_type: string
  event_name: string
  path: string | null
  label: string | null
  entity_table: string | null
  entity_id: string | null
}

export type SignInActivityPayload = {
  login_event_id: string
  session_id: string | null
  started_at: string
  ended_at: string | null
  rows: SignInActivityRow[]
}

export const SIGN_IN_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
] as const

/** Best available name for the person who signed in. */
export function signInDisplayName(row: Pick<SignInRow,
  'full_name' | 'member_first_name' | 'member_last_name' | 'email'>): string {
  const full = row.full_name?.trim()
  if (full) return full
  const member = [row.member_first_name, row.member_last_name]
    .map((p) => p?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
  if (member) return member
  const email = row.email?.trim()
  if (email) return email
  return 'Unidentified visitor'
}

/** 'admin_login' / 'member_login' → a label for the table. */
export function signInKindLabel(kind: string | null | undefined): 'Admin' | 'Member' {
  return kind === 'admin_login' ? 'Admin' : 'Member'
}

/** Turn a stored role slug into a readable label ('community_admin' → 'Community admin'). */
export function formatRoleLabel(role: string | null | undefined): string | null {
  const r = role?.trim()
  if (!r) return null
  const words = r.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** One line describing what an event in the session trail actually was. */
export function describeActivityEvent(row: SignInActivityRow): { action: string; detail: string | null } {
  const label = row.label?.trim() || null
  const path = row.path?.trim() || null

  switch (row.event_type) {
    case 'page_view':
      return { action: 'Viewed page', detail: path }
    case 'cta_click':
      return { action: `Clicked “${label ?? row.event_name}”`, detail: path }
    case 'entity_view':
      return {
        action: `Opened ${row.entity_table ? singularize(row.entity_table) : 'record'}`,
        detail: path,
      }
    case 'entity_click':
      return {
        action: `Clicked ${label ?? row.event_name} on ${row.entity_table ? singularize(row.entity_table) : 'record'}`,
        detail: path,
      }
    case 'map_open':
      return { action: 'Opened directions', detail: label ?? path }
    case 'submission_created':
      return { action: `Submitted ${row.event_name.replace(/^submission_/, '') || 'form'}`, detail: path }
    default:
      return { action: row.event_name, detail: path }
  }
}

function singularize(table: string): string {
  const name = table.replace(/_/g, ' ')
  if (/ies$/.test(name)) return `${name.slice(0, -3)}y`
  if (/(s|x|z|ch|sh)es$/.test(name)) return name.slice(0, -2)
  if (/s$/.test(name) && !/ss$/.test(name)) return name.slice(0, -1)
  return name
}
