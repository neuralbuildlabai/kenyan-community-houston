import { supabase } from '@/lib/supabase'

/**
 * Admin dashboard summary — wraps `kigh_admin_dashboard_summary()` from
 * migration 068. Elevated admins only; RLS bypass via SECURITY DEFINER.
 */

export type AdminDashboardMembersSummary = {
  total: number
  pending: number
  /** Active membership applications (membership_status = active). */
  approved: number
}

export type AdminDashboardProfilesSummary = {
  total: number
}

export type AdminDashboardEventsSummary = {
  published: number
  pending: number
  upcoming_published: number
}

export type AdminDashboardAnnouncementsSummary = {
  published: number
  pending: number
  expiring_soon: number
}

export type AdminDashboardContentSummary = {
  published: number
  pending: number
}

export type AdminDashboardFundraisersSummary = AdminDashboardContentSummary & {
  /** Published fundraisers with no deadline or deadline on/after today (Chicago). */
  live: number
}

export type AdminDashboardGallerySummary = {
  pending_images: number
  total_images: number
}

export type AdminDashboardMemberMediaSummary = {
  pending: number
  total: number
}

export type AdminDashboardContactMessagesSummary = {
  new: number
  total: number
}

export type AdminDashboardPublicSubmissionsSummary = {
  pending_total: number
}

export type AdminDashboardSignupsSummary = {
  total: number
  submitted: number
}

export type AdminDashboardPollsSummary = {
  active: number
  total_votes: number
  votes_7d: number
  votes_30d: number
}

export type AdminDashboardCommunitySummary = {
  open_chat_threads: number
  pending_community_groups: number
  pending_event_comments: number
  new_service_interests: number
  member_invites_total: number
  member_invites_opened: number
}

export type AdminDashboardSummary = {
  checked_at: string
  members: AdminDashboardMembersSummary
  profiles: AdminDashboardProfilesSummary
  events: AdminDashboardEventsSummary
  announcements: AdminDashboardAnnouncementsSummary
  businesses: AdminDashboardContentSummary
  fundraisers: AdminDashboardFundraisersSummary
  gallery: AdminDashboardGallerySummary
  member_media_submissions: AdminDashboardMemberMediaSummary
  contact_messages: AdminDashboardContactMessagesSummary
  public_submissions: AdminDashboardPublicSubmissionsSummary
  volunteers: AdminDashboardSignupsSummary
  vendors: AdminDashboardSignupsSummary
  polls: AdminDashboardPollsSummary
  community: AdminDashboardCommunitySummary
}

/** Flat KPI shape consumed by DashboardPage stat tiles. */
export type AdminDashboardStats = {
  members_total: number
  members_pending: number
  events_published: number
  events_pending: number
  announcements_published: number
  announcements_pending: number
  businesses_published: number
  businesses_pending: number
  fundraisers_active: number
  fundraisers_pending: number
  gallery_pending: number
  media_submissions_pending: number
  contacts_new: number
  profiles_total: number
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function section(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
}

function buildSection<T extends Record<string, number>>(
  raw: unknown,
  keys: (keyof T)[]
): T {
  const src = section(raw)
  const out = {} as T
  for (const key of keys) {
    out[key] = num(src[key as string]) as T[keyof T]
  }
  return out
}

export const EMPTY_ADMIN_DASHBOARD_SUMMARY: AdminDashboardSummary = {
  checked_at: '',
  members: { total: 0, pending: 0, approved: 0 },
  profiles: { total: 0 },
  events: { published: 0, pending: 0, upcoming_published: 0 },
  announcements: { published: 0, pending: 0, expiring_soon: 0 },
  businesses: { published: 0, pending: 0 },
  fundraisers: { published: 0, pending: 0, live: 0 },
  gallery: { pending_images: 0, total_images: 0 },
  member_media_submissions: { pending: 0, total: 0 },
  contact_messages: { new: 0, total: 0 },
  public_submissions: { pending_total: 0 },
  volunteers: { total: 0, submitted: 0 },
  vendors: { total: 0, submitted: 0 },
  polls: { active: 0, total_votes: 0, votes_7d: 0, votes_30d: 0 },
  community: {
    open_chat_threads: 0,
    pending_community_groups: 0,
    pending_event_comments: 0,
    new_service_interests: 0,
    member_invites_total: 0,
    member_invites_opened: 0,
  },
}

export const EMPTY_ADMIN_DASHBOARD_STATS: AdminDashboardStats = {
  members_total: 0,
  members_pending: 0,
  events_published: 0,
  events_pending: 0,
  announcements_published: 0,
  announcements_pending: 0,
  businesses_published: 0,
  businesses_pending: 0,
  fundraisers_active: 0,
  fundraisers_pending: 0,
  gallery_pending: 0,
  media_submissions_pending: 0,
  contacts_new: 0,
  profiles_total: 0,
}

export function mapAdminDashboardSummary(raw: unknown): AdminDashboardSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const root = raw as Record<string, unknown>

  return {
    checked_at: typeof root.checked_at === 'string' ? root.checked_at : '',
    members: buildSection<AdminDashboardMembersSummary>(root.members, ['total', 'pending', 'approved']),
    profiles: buildSection<AdminDashboardProfilesSummary>(root.profiles, ['total']),
    events: buildSection<AdminDashboardEventsSummary>(root.events, ['published', 'pending', 'upcoming_published']),
    announcements: buildSection<AdminDashboardAnnouncementsSummary>(root.announcements, [
      'published',
      'pending',
      'expiring_soon',
    ]),
    businesses: buildSection<AdminDashboardContentSummary>(root.businesses, ['published', 'pending']),
    fundraisers: buildSection<AdminDashboardFundraisersSummary>(root.fundraisers, [
      'published',
      'pending',
      'live',
    ]),
    gallery: buildSection<AdminDashboardGallerySummary>(root.gallery, ['pending_images', 'total_images']),
    member_media_submissions: buildSection<AdminDashboardMemberMediaSummary>(root.member_media_submissions, [
      'pending',
      'total',
    ]),
    contact_messages: buildSection<AdminDashboardContactMessagesSummary>(root.contact_messages, ['new', 'total']),
    public_submissions: buildSection<AdminDashboardPublicSubmissionsSummary>(root.public_submissions, [
      'pending_total',
    ]),
    volunteers: buildSection<AdminDashboardSignupsSummary>(root.volunteers, ['total', 'submitted']),
    vendors: buildSection<AdminDashboardSignupsSummary>(root.vendors, ['total', 'submitted']),
    polls: buildSection<AdminDashboardPollsSummary>(root.polls, ['active', 'total_votes', 'votes_7d', 'votes_30d']),
    community: buildSection<AdminDashboardCommunitySummary>(root.community, [
      'open_chat_threads',
      'pending_community_groups',
      'pending_event_comments',
      'new_service_interests',
      'member_invites_total',
      'member_invites_opened',
    ]),
  }
}

/** Maps the RPC summary into the flat stats shape used by dashboard tiles. */
export function mapSummaryToDashboardStats(summary: AdminDashboardSummary): AdminDashboardStats {
  return {
    members_total: summary.members.total,
    members_pending: summary.members.pending,
    events_published: summary.events.published,
    events_pending: summary.events.pending,
    announcements_published: summary.announcements.published,
    announcements_pending: summary.announcements.pending,
    businesses_published: summary.businesses.published,
    businesses_pending: summary.businesses.pending,
    fundraisers_active: summary.fundraisers.live,
    fundraisers_pending: summary.fundraisers.pending,
    gallery_pending: summary.gallery.pending_images,
    media_submissions_pending: summary.member_media_submissions.pending,
    contacts_new: summary.contact_messages.new,
    profiles_total: summary.profiles.total,
  }
}

export async function getAdminDashboardSummary(): Promise<{
  data: AdminDashboardSummary | null
  error: string | null
}> {
  const { data, error } = await supabase.rpc('kigh_admin_dashboard_summary')

  if (error) {
    return { data: null, error: error.message }
  }

  const mapped = mapAdminDashboardSummary(data)
  if (!mapped) {
    return { data: null, error: 'Unexpected dashboard summary response shape.' }
  }

  return { data: mapped, error: null }
}

// ─── Analytics ranges (migration 069) ───────────────────────

/** Click-style event types tracked in src/lib/analytics.ts */
export const ANALYTICS_CLICK_EVENT_TYPES = ['cta_click', 'entity_click'] as const

export type EngagementByDayRow = {
  bucket_date: string
  page_views: number
  unique_sessions: number
  clicks: number
  cta_clicks: number
  form_submissions: number
  sign_ins: number
}

export type EngagementByMonthRow = {
  bucket_month: string
  page_views: number
  unique_sessions: number
  clicks: number
  cta_clicks: number
  form_submissions: number
  sign_ins: number
}

export type TopPageRow = {
  path: string
  page_title: string
  views: number
  unique_sessions: number
  clicks_on_path: number
  last_accessed_at: string
}

export type TopCtaRow = {
  element_label: string
  path: string
  clicks: number
  last_clicked_at: string
  element_href: string
}

export type DashboardAnalyticsPeriod = '7d' | '30d' | '90d' | 'monthly'

export function analyticsPeriodToDays(period: DashboardAnalyticsPeriod): number {
  switch (period) {
    case '7d':
      return 7
    case '90d':
      return 90
    case '30d':
    default:
      return 30
  }
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value == null) return fallback
  return String(value)
}

function isoTimestamp(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') return value
  return ''
}

function mapEngagementRow(
  raw: unknown,
  bucketKey: 'bucket_date' | 'bucket_month'
): EngagementByDayRow | EngagementByMonthRow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const bucket = isoTimestamp(row[bucketKey])
  if (!bucket) return null
  return {
    [bucketKey]: bucket,
    page_views: num(row.page_views),
    unique_sessions: num(row.unique_sessions),
    clicks: num(row.clicks),
    cta_clicks: num(row.cta_clicks),
    form_submissions: num(row.form_submissions),
    sign_ins: num(row.sign_ins),
  } as EngagementByDayRow | EngagementByMonthRow
}

export function mapEngagementByDayRows(raw: unknown): EngagementByDayRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => mapEngagementRow(row, 'bucket_date') as EngagementByDayRow | null)
    .filter((row): row is EngagementByDayRow => row !== null)
}

export function mapEngagementByMonthRows(raw: unknown): EngagementByMonthRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => mapEngagementRow(row, 'bucket_month') as EngagementByMonthRow | null)
    .filter((row): row is EngagementByMonthRow => row !== null)
}

export function mapTopPageRows(raw: unknown): TopPageRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const row = item as Record<string, unknown>
      const path = str(row.path, '/')
      return {
        path,
        page_title: str(row.page_title),
        views: num(row.views),
        unique_sessions: num(row.unique_sessions),
        clicks_on_path: num(row.clicks_on_path),
        last_accessed_at: isoTimestamp(row.last_accessed_at),
      }
    })
    .filter((row): row is TopPageRow => row !== null)
}

export function mapTopCtaRows(raw: unknown): TopCtaRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const row = item as Record<string, unknown>
      const element_label = str(row.element_label).trim()
      if (!element_label) return null
      return {
        element_label,
        path: str(row.path, '/'),
        clicks: num(row.clicks),
        last_clicked_at: isoTimestamp(row.last_clicked_at),
        element_href: str(row.element_href),
      }
    })
    .filter((row): row is TopCtaRow => row !== null)
}

export async function getEngagementByDay(days = 30): Promise<{
  data: EngagementByDayRow[]
  error: string | null
}> {
  const { data, error } = await supabase.rpc('kigh_admin_engagement_by_day', { p_days: days })
  if (error) return { data: [], error: error.message }
  return { data: mapEngagementByDayRows(data), error: null }
}

export async function getEngagementByMonth(months = 12): Promise<{
  data: EngagementByMonthRow[]
  error: string | null
}> {
  const { data, error } = await supabase.rpc('kigh_admin_engagement_by_month', { p_months: months })
  if (error) return { data: [], error: error.message }
  return { data: mapEngagementByMonthRows(data), error: null }
}

export async function getTopPages(
  days = 30,
  limit = 10
): Promise<{ data: TopPageRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('kigh_admin_top_pages', {
    p_days: days,
    p_limit: limit,
  })
  if (error) return { data: [], error: error.message }
  return { data: mapTopPageRows(data), error: null }
}

export async function getTopCtas(
  days = 30,
  limit = 10
): Promise<{ data: TopCtaRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc('kigh_admin_top_ctas', {
    p_days: days,
    p_limit: limit,
  })
  if (error) return { data: [], error: error.message }
  return { data: mapTopCtaRows(data), error: null }
}

// ─── Platform infrastructure (migration 070, super_admin only) ─

export type DatabaseOverview = {
  database_size_bytes: number
  database_size_pretty: string
  table_count: number
  analytics_events_size_bytes: number | null
  analytics_events_size_pretty: string | null
  notes: string
}

export type LargestTableMetric = {
  schema_name: string
  table_name: string
  row_estimate: number
  table_size_bytes: number
  index_size_bytes: number
  total_size_bytes: number
  total_size_pretty: string
}

export type StorageBucketMetric = {
  bucket_id: string
  object_count: number
  total_size_bytes: number | null
  total_size_pretty: string | null
  unavailable_reason: string | null
}

export type StorageOverview = {
  buckets: StorageBucketMetric[]
  total_object_count: number
  total_size_bytes: number | null
  total_size_pretty: string | null
  unavailable_reason: string | null
}

export type SystemWarningSeverity = 'info' | 'warning' | 'critical'

export type SystemWarning = {
  severity: SystemWarningSeverity
  title: string
  description: string
  count: number
  route: string
  checked_at: string
}

export type DashboardInfrastructureSummary = {
  checked_at: string
  database: DatabaseOverview
  largest_tables: LargestTableMetric[]
  storage: StorageOverview
  warnings: SystemWarning[]
}

function nullableNum(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function nullableStr(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return String(value)
}

function warningSeverity(value: unknown): SystemWarningSeverity {
  if (value === 'critical' || value === 'warning' || value === 'info') return value
  return 'info'
}

export const EMPTY_DASHBOARD_INFRASTRUCTURE: DashboardInfrastructureSummary = {
  checked_at: '',
  database: {
    database_size_bytes: 0,
    database_size_pretty: '',
    table_count: 0,
    analytics_events_size_bytes: null,
    analytics_events_size_pretty: null,
    notes: '',
  },
  largest_tables: [],
  storage: {
    buckets: [],
    total_object_count: 0,
    total_size_bytes: null,
    total_size_pretty: null,
    unavailable_reason: null,
  },
  warnings: [],
}

export function mapStorageBucketMetric(raw: unknown): StorageBucketMetric | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const bucket_id = str(row.bucket_id).trim()
  if (!bucket_id) return null
  return {
    bucket_id,
    object_count: num(row.object_count),
    total_size_bytes: nullableNum(row.total_size_bytes),
    total_size_pretty: nullableStr(row.total_size_pretty),
    unavailable_reason: nullableStr(row.unavailable_reason),
  }
}

export function mapStorageOverview(raw: unknown): StorageOverview {
  const src = section(raw)
  const bucketsRaw = src.buckets
  const buckets = Array.isArray(bucketsRaw)
    ? bucketsRaw
        .map(mapStorageBucketMetric)
        .filter((row): row is StorageBucketMetric => row !== null)
    : []
  return {
    buckets,
    total_object_count: num(src.total_object_count),
    total_size_bytes: nullableNum(src.total_size_bytes),
    total_size_pretty: nullableStr(src.total_size_pretty),
    unavailable_reason: nullableStr(src.unavailable_reason),
  }
}

export function mapLargestTableMetric(raw: unknown): LargestTableMetric | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const table_name = str(row.table_name).trim()
  if (!table_name) return null
  return {
    schema_name: str(row.schema_name, 'public'),
    table_name,
    row_estimate: num(row.row_estimate),
    table_size_bytes: num(row.table_size_bytes),
    index_size_bytes: num(row.index_size_bytes),
    total_size_bytes: num(row.total_size_bytes),
    total_size_pretty: str(row.total_size_pretty),
  }
}

export function mapSystemWarning(raw: unknown): SystemWarning | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const title = str(row.title).trim()
  if (!title) return null
  return {
    severity: warningSeverity(row.severity),
    title,
    description: str(row.description),
    count: num(row.count),
    route: str(row.route, '/admin/dashboard'),
    checked_at: isoTimestamp(row.checked_at),
  }
}

export function mapDatabaseOverview(raw: unknown): DatabaseOverview {
  const src = section(raw)
  return {
    database_size_bytes: num(src.database_size_bytes),
    database_size_pretty: str(src.database_size_pretty),
    table_count: num(src.table_count),
    analytics_events_size_bytes: nullableNum(src.analytics_events_size_bytes),
    analytics_events_size_pretty: nullableStr(src.analytics_events_size_pretty),
    notes: str(src.notes),
  }
}

export function mapDashboardInfrastructure(raw: unknown): DashboardInfrastructureSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const root = raw as Record<string, unknown>
  const largestRaw = root.largest_tables
  const warningsRaw = root.warnings
  return {
    checked_at: isoTimestamp(root.checked_at),
    database: mapDatabaseOverview(root.database),
    largest_tables: Array.isArray(largestRaw)
      ? largestRaw
          .map(mapLargestTableMetric)
          .filter((row): row is LargestTableMetric => row !== null)
      : [],
    storage: mapStorageOverview(root.storage),
    warnings: Array.isArray(warningsRaw)
      ? warningsRaw.map(mapSystemWarning).filter((row): row is SystemWarning => row !== null)
      : [],
  }
}

export async function getDashboardInfrastructure(): Promise<{
  data: DashboardInfrastructureSummary | null
  error: string | null
}> {
  const { data, error } = await supabase.rpc('kigh_admin_dashboard_infrastructure')

  if (error) {
    return { data: null, error: error.message }
  }

  const mapped = mapDashboardInfrastructure(data)
  if (!mapped) {
    return { data: null, error: 'Unexpected infrastructure response shape.' }
  }

  return { data: mapped, error: null }
}
