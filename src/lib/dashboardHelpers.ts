import type {
  DashboardAnalyticsPeriod,
  EngagementByDayRow,
  EngagementByMonthRow,
} from '@/lib/adminDashboardApi'
import { subDays, format } from 'date-fns'

export type EngagementTotals = {
  page_views: number
  unique_sessions: number
  clicks: number
  cta_clicks: number
  form_submissions: number
  sign_ins: number
}

export type TrendPoint = {
  label: string
  page_views: number
  unique_sessions: number
  clicks: number
  form_submissions: number
}

const KNOWN_PATH_LABELS: Record<string, string> = {
  '/': 'Home',
  '/events': 'Events',
  '/announcements': 'Announcements',
  '/businesses': 'Businesses',
  '/fundraisers': 'Fundraisers',
  '/gallery': 'Gallery',
  '/members': 'Members',
  '/about': 'About',
  '/contact': 'Contact',
  '/resources': 'Resources',
  '/polls': 'Polls',
  '/login': 'Login',
  '/register': 'Register',
  '/admin': 'Admin',
  '/admin/analytics': 'Admin Analytics',
}

function titleCaseSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Human-readable label for analytics paths; keeps raw path for muted display. */
export function formatAnalyticsPathLabel(path: string): { label: string; rawPath: string } {
  const rawPath = path.trim() || '/'
  const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const known = KNOWN_PATH_LABELS[normalized]
  if (known) return { label: known, rawPath: normalized }

  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 0) return { label: 'Home', rawPath: '/' }

  const last = segments[segments.length - 1] ?? ''
  if (/^[0-9a-f-]{36}$/i.test(last) && segments.length >= 2) {
    const parent = `/${segments.slice(0, -1).join('/')}`
    const parentLabel = KNOWN_PATH_LABELS[parent] ?? titleCaseSegment(segments[segments.length - 2] ?? last)
    return { label: `${parentLabel} detail`, rawPath: normalized }
  }

  return { label: titleCaseSegment(last), rawPath: normalized }
}

/** Safe display for CTA href values — relative paths only; external URLs omitted. */
export function formatSafeCtaHref(href: string): string | null {
  const trimmed = href.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  return null
}

export function analyticsPeriodLabel(period: DashboardAnalyticsPeriod): string {
  switch (period) {
    case '7d':
      return 'Last 7 days'
    case '90d':
      return 'Last 90 days'
    case 'monthly':
      return 'Last 12 months'
    case '30d':
    default:
      return 'Last 30 days'
  }
}

export function analyticsDateRangeLabel(period: DashboardAnalyticsPeriod, today = new Date()): string {
  if (period === 'monthly') {
    const start = new Date(today.getFullYear(), today.getMonth() - 11, 1)
    return `${format(start, 'MMM yyyy')} – ${format(today, 'MMM yyyy')}`
  }
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
  const start = subDays(today, days - 1)
  return `${format(start, 'MMM d, yyyy')} – ${format(today, 'MMM d, yyyy')}`
}

export function aggregateEngagementTotals(
  daily: EngagementByDayRow[],
  monthly: EngagementByMonthRow[],
  period: DashboardAnalyticsPeriod
): EngagementTotals {
  const rows = period === 'monthly' ? monthly : daily
  return rows.reduce(
    (acc, row) => ({
      page_views: acc.page_views + row.page_views,
      unique_sessions: acc.unique_sessions + row.unique_sessions,
      clicks: acc.clicks + row.clicks,
      cta_clicks: acc.cta_clicks + row.cta_clicks,
      form_submissions: acc.form_submissions + row.form_submissions,
      sign_ins: acc.sign_ins + row.sign_ins,
    }),
    {
      page_views: 0,
      unique_sessions: 0,
      clicks: 0,
      cta_clicks: 0,
      form_submissions: 0,
      sign_ins: 0,
    }
  )
}

export function engagementToTrendPoints(
  daily: EngagementByDayRow[],
  monthly: EngagementByMonthRow[],
  period: DashboardAnalyticsPeriod
): TrendPoint[] {
  if (period === 'monthly') {
    return monthly.map((row) => ({
      label: row.bucket_month.slice(0, 7),
      page_views: row.page_views,
      unique_sessions: row.unique_sessions,
      clicks: row.clicks,
      form_submissions: row.form_submissions,
    }))
  }
  return daily.map((row) => ({
    label: row.bucket_date.slice(5),
    page_views: row.page_views,
    unique_sessions: row.unique_sessions,
    clicks: row.clicks,
    form_submissions: row.form_submissions,
  }))
}

export function trendSeriesMax(points: TrendPoint[]): number {
  if (points.length === 0) return 1
  let max = 1
  for (const p of points) {
    max = Math.max(max, p.page_views, p.unique_sessions, p.clicks, p.form_submissions)
  }
  return max
}

export function buildTrendPolyline(
  values: number[],
  max: number,
  width: number,
  height: number,
  padding = 4
): string {
  if (values.length === 0) return ''
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const step = values.length <= 1 ? 0 : innerW / (values.length - 1)

  return values
    .map((value, index) => {
      const x = padding + index * step
      const y = padding + innerH - (value / max) * innerH
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}