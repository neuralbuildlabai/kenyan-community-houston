import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  Heart,
  Image,
  Mail,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  RefreshCw,
  Eye,
  FileInput,
  LogIn,
  Users,
  UserCheck,
  Vote,
  HeartHandshake,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminStatCard } from '@/components/admin/dashboard/AdminStatCard'
import { DashboardMetricCard } from '@/components/admin/dashboard/DashboardMetricCard'
import { DashboardSectionCard } from '@/components/admin/dashboard/DashboardSectionCard'
import { DashboardStatusBanner } from '@/components/admin/dashboard/DashboardStatusBanner'
import { DashboardTimeRangeToggle } from '@/components/admin/dashboard/DashboardTimeRangeToggle'
import { NeedsAttentionPanel } from '@/components/admin/dashboard/NeedsAttentionPanel'
import {
  RecentActivityPanel,
  RecentActivityPanelHeaderAction,
  type RecentActivityItem,
} from '@/components/admin/dashboard/RecentActivityPanel'
import { TopAccessedPagesTable } from '@/components/admin/dashboard/TopAccessedPagesTable'
import { TopClickedCtasTable } from '@/components/admin/dashboard/TopClickedCtasTable'
import { TrafficTrendPanel } from '@/components/admin/dashboard/TrafficTrendPanel'
import {
  UpcomingEventsPanel,
  UpcomingEventsPanelHeaderAction,
  type UpcomingEventItem,
} from '@/components/admin/dashboard/UpcomingEventsPanel'
import { PlatformOperationsSection } from '@/components/admin/dashboard/PlatformOperationsSection'
import {
  EMPTY_ADMIN_DASHBOARD_SUMMARY,
  analyticsPeriodToDays,
  getAdminDashboardSummary,
  getDashboardInfrastructure,
  getEngagementByDay,
  getEngagementByMonth,
  getTopCtas,
  getTopPages,
  type AdminDashboardSummary,
  type DashboardAnalyticsPeriod,
  type DashboardInfrastructureSummary,
  type EngagementByDayRow,
  type EngagementByMonthRow,
  type TopCtaRow,
  type TopPageRow,
} from '@/lib/adminDashboardApi'
import {
  aggregateEngagementTotals,
  analyticsDateRangeLabel,
  analyticsPeriodLabel,
  engagementToTrendPoints,
} from '@/lib/dashboardHelpers'
import { isSuperAdminRole, isSystemHealthAdminRole } from '@/lib/platformAdmin'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function AdminDashboardPage() {
  const { role, loading: authLoading } = useAuth()
  const isSuperAdmin = isSuperAdminRole(role)
  const showSystemHealthLink = isSystemHealthAdminRole(role)
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [recent, setRecent] = useState<RecentActivityItem[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingEventItem[]>([])
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<DashboardAnalyticsPeriod>('30d')
  const [engagementDaily, setEngagementDaily] = useState<EngagementByDayRow[]>([])
  const [engagementMonthly, setEngagementMonthly] = useState<EngagementByMonthRow[]>([])
  const [topPages, setTopPages] = useState<TopPageRow[]>([])
  const [topCtas, setTopCtas] = useState<TopCtaRow[]>([])
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [infrastructure, setInfrastructure] = useState<DashboardInfrastructureSummary | null>(null)
  const [infrastructureError, setInfrastructureError] = useState<string | null>(null)
  const [infrastructureLoading, setInfrastructureLoading] = useState(false)

  const loadOperationalData = useCallback(async () => {
    const todayYmd = format(new Date(), 'yyyy-MM-dd')
    const [
      dashboardSummaryResult,
      { data: recentEvents },
      { data: recentAnn },
      { data: recentBiz },
      { data: recentFund },
      { data: recentContacts },
      { data: recentMedia },
      { data: upcomingRows },
    ] = await Promise.all([
      getAdminDashboardSummary(),
      supabase.from('events').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(4),
      supabase.from('announcements').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(4),
      supabase.from('businesses').select('id, name, status, created_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('fundraisers').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(3),
      supabase
        .from('contact_submissions')
        .select('id, subject, name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('member_media_submissions')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('events')
        .select('id, title, start_date, location')
        .eq('status', 'published')
        .gte('start_date', todayYmd)
        .order('start_date', { ascending: true })
        .limit(5),
    ])

    if (dashboardSummaryResult.error || !dashboardSummaryResult.data) {
      setSummaryError(
        dashboardSummaryResult.error ??
          'Dashboard summary is temporarily unavailable. Apply migration 068 or sign in with an elevated admin role.'
      )
      setSummary({ ...EMPTY_ADMIN_DASHBOARD_SUMMARY })
    } else {
      setSummaryError(null)
      setSummary(dashboardSummaryResult.data)
    }

    const combined: RecentActivityItem[] = [
      ...(recentEvents ?? []).map((e) => ({ ...e, type: 'Event' as const })),
      ...(recentAnn ?? []).map((a) => ({ ...a, type: 'Announcement' as const })),
      ...(recentBiz ?? []).map((b) => ({
        id: b.id,
        title: b.name,
        status: b.status,
        created_at: b.created_at,
        type: 'Business' as const,
      })),
      ...(recentFund ?? []).map((f) => ({ ...f, type: 'Fundraiser' as const })),
      ...(recentContacts ?? []).map((c) => ({
        id: c.id,
        title: c.subject || c.name || 'Contact message',
        status: c.status ?? 'new',
        created_at: c.created_at,
        type: 'Contact' as const,
      })),
      ...(recentMedia ?? []).map((m) => ({
        id: m.id,
        title: m.title || 'Media submission',
        status: m.status,
        created_at: m.created_at,
        type: 'Media' as const,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12)

    setRecent(combined)
    setUpcoming(
      (upcomingRows ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        start_date: e.start_date,
        location: e.location ?? null,
      }))
    )
  }, [])

  const loadAnalytics = useCallback(async (period: DashboardAnalyticsPeriod) => {
    setAnalyticsLoading(true)
    const days = analyticsPeriodToDays(period)
    const [dailyResult, monthlyResult, topPagesResult, topCtasResult] = await Promise.all([
      period === 'monthly'
        ? Promise.resolve({ data: [] as EngagementByDayRow[], error: null as string | null })
        : getEngagementByDay(days),
      period === 'monthly' ? getEngagementByMonth(12) : Promise.resolve({ data: [] as EngagementByMonthRow[], error: null as string | null }),
      getTopPages(days, 10),
      getTopCtas(days, 10),
    ])

    const errors = [dailyResult.error, monthlyResult.error, topPagesResult.error, topCtasResult.error].filter(Boolean)

    setAnalyticsError(
      errors.length > 0
        ? (errors[0] ??
            'Analytics ranges are temporarily unavailable. Apply migration 069 or sign in with an elevated admin role.')
        : null
    )
    setEngagementDaily(dailyResult.data)
    setEngagementMonthly(monthlyResult.data)
    setTopPages(topPagesResult.data)
    setTopCtas(topCtasResult.data)
    setAnalyticsLoading(false)
  }, [])

  const loadInfrastructure = useCallback(async () => {
    if (authLoading || !isSuperAdmin) {
      setInfrastructure(null)
      setInfrastructureError(null)
      setInfrastructureLoading(false)
      return
    }
    setInfrastructureLoading(true)
    const result = await getDashboardInfrastructure()
    if (result.error || !result.data) {
      setInfrastructureError(
        result.error ??
          'Platform infrastructure metrics are unavailable. Apply migration 070 or confirm super_admin access.'
      )
      setInfrastructure(null)
    } else {
      setInfrastructureError(null)
      setInfrastructure(result.data)
    }
    setInfrastructureLoading(false)
  }, [authLoading, isSuperAdmin])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadOperationalData()
      setLoading(false)
    }
    void init()
  }, [loadOperationalData])

  useEffect(() => {
    void loadAnalytics(analyticsPeriod)
  }, [analyticsPeriod, loadAnalytics])

  useEffect(() => {
    void loadInfrastructure()
  }, [loadInfrastructure])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      loadOperationalData(),
      loadAnalytics(analyticsPeriod),
      loadInfrastructure(),
    ])
    setRefreshing(false)
  }, [analyticsPeriod, loadAnalytics, loadInfrastructure, loadOperationalData])

  const periodLabel = analyticsPeriodLabel(analyticsPeriod)
  const dateRangeLabel = analyticsDateRangeLabel(analyticsPeriod)

  const engagementTotals = useMemo(
    () => aggregateEngagementTotals(engagementDaily, engagementMonthly, analyticsPeriod),
    [engagementDaily, engagementMonthly, analyticsPeriod]
  )

  const trendPoints = useMemo(
    () => engagementToTrendPoints(engagementDaily, engagementMonthly, analyticsPeriod),
    [engagementDaily, engagementMonthly, analyticsPeriod]
  )

  const pendingReviews = summary
    ? summary.events.pending +
      summary.announcements.pending +
      summary.businesses.pending +
      summary.fundraisers.pending +
      summary.public_submissions.pending_total
    : 0

  return (
    <div className="-mx-4 -my-4 min-h-full space-y-7 bg-[hsl(48_32%_97%)] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-kenyan-green-50/90 via-white to-[hsl(48_32%_98%)] px-5 py-6 sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-kenyan-green-600/80 via-kenyan-green-500/50 to-teal-500/40"
          aria-hidden
        />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              Community Platform Dashboard
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Operations and engagement overview of the community platform.
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">{periodLabel}</span>
              <span aria-hidden> · </span>
              {dateRangeLabel}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <DashboardTimeRangeToggle value={analyticsPeriod} onChange={setAnalyticsPeriod} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-slate-200/70 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-white"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                aria-label="Refresh dashboard data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              <Button asChild variant="default" size="sm" className="gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                <Link to="/admin/analytics">
                  <BarChart3 className="h-4 w-4" aria-hidden />
                  View full analytics
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {summaryError ? (
        <DashboardStatusBanner message={`${summaryError} KPI counts below may show zero until the summary service is available.`} />
      ) : null}

      {/* Primary KPIs — Community Snapshot */}
      <section
        aria-labelledby="primary-kpis-heading"
        className="overflow-hidden rounded-2xl border border-kenyan-green-100/50 bg-gradient-to-br from-kenyan-green-50/50 via-white to-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        <div className="border-b border-kenyan-green-100/40 px-5 py-3.5">
          <h2 id="primary-kpis-heading" className="text-sm font-semibold tracking-tight text-foreground">
            Community snapshot
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Key platform metrics at a glance</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-kenyan-green-100/35 lg:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
          <AdminStatCard
            label="Total Members"
            value={summary?.members.total ?? 0}
            sublabel="Registered community members"
            href="/admin/members"
            icon={Users}
            loading={loading}
            layout="strip"
          />
          <AdminStatCard
            label="Active Members"
            value={summary?.members.approved ?? 0}
            sublabel="Approved memberships"
            href="/admin/members"
            icon={UserCheck}
            loading={loading}
            layout="strip"
          />
          <AdminStatCard
            label="Published Events"
            value={summary?.events.published ?? 0}
            sublabel={`${summary?.events.upcoming_published ?? 0} upcoming`}
            href="/admin/calendar"
            icon={Calendar}
            loading={loading}
            layout="strip"
          />
          <AdminStatCard
            label="Businesses Listed"
            value={summary?.businesses.published ?? 0}
            sublabel={`${summary?.businesses.pending ?? 0} pending review`}
            href="/admin/businesses"
            icon={Building2}
            loading={loading}
            layout="strip"
          />
          <AdminStatCard
            label="Live Fundraisers"
            value={summary?.fundraisers.live ?? 0}
            sublabel={`${summary?.fundraisers.pending ?? 0} pending review`}
            href="/admin/fundraisers"
            icon={Heart}
            loading={loading}
            layout="strip"
          />
          <AdminStatCard
            label="Pending Reviews"
            value={pendingReviews}
            sublabel="Content awaiting approval"
            href={pendingReviews > 0 ? '/admin/submissions?status=pending' : '/admin/submissions'}
            icon={ClipboardList}
            loading={loading}
            accent="warning"
            layout="strip"
          />
        </div>
      </section>

      {/* Secondary operational metrics */}
      <section
        aria-labelledby="operational-kpis-heading"
        className="overflow-hidden rounded-2xl border border-slate-200/40 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
      >
        <div className="border-b border-slate-100/80 px-5 py-3.5">
          <h2 id="operational-kpis-heading" className="text-sm font-semibold tracking-tight text-foreground">
            Operations
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Queues, signups, and day-to-day admin work</p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100/80 md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          <AdminStatCard
            label="Membership Applications"
            value={summary?.members.pending ?? 0}
            sublabel="Pending approval"
            href={summary && summary.members.pending > 0 ? '/admin/members?membershipStatus=pending' : '/admin/members'}
            icon={Users}
            loading={loading}
            accent="warning"
            layout="compact"
          />
          <AdminStatCard
            label="Contact Messages"
            value={summary?.contact_messages.new ?? 0}
            sublabel="Unread / new"
            href={summary && summary.contact_messages.new > 0 ? '/admin/contacts?status=new' : '/admin/contacts'}
            icon={MessageSquare}
            loading={loading}
            accent="warning"
            layout="compact"
          />
          <AdminStatCard
            label="Gallery / Media Review"
            value={(summary?.gallery.pending_images ?? 0) + (summary?.member_media_submissions.pending ?? 0)}
            sublabel="Pending images & uploads"
            href={
              summary && summary.gallery.pending_images > 0
                ? '/admin/gallery?tab=review'
                : summary && summary.member_media_submissions.pending > 0
                  ? '/admin/media-submissions?status=pending'
                  : '/admin/gallery'
            }
            icon={Image}
            loading={loading}
            accent="warning"
            layout="compact"
          />
          <AdminStatCard
            label="Volunteer Signups"
            value={summary?.volunteers.submitted ?? 0}
            sublabel={`${summary?.volunteers.total ?? 0} total signups`}
            href="/admin/volunteers"
            icon={HeartHandshake}
            loading={loading}
            layout="compact"
          />
          <AdminStatCard
            label="Vendor Signups"
            value={summary?.vendors.submitted ?? 0}
            sublabel={`${summary?.vendors.total ?? 0} total signups`}
            href="/admin/vendors"
            icon={Store}
            loading={loading}
            layout="compact"
          />
          <AdminStatCard
            label="Poll Activity"
            value={summary?.polls.active ?? 0}
            sublabel={`${summary?.polls.votes_30d ?? 0} votes (30d)`}
            href="/admin/polls"
            icon={Vote}
            loading={loading}
            layout="compact"
          />
        </div>
      </section>

      {/* Analytics */}
      <section aria-labelledby="analytics-summary-heading" className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-teal-200/35 bg-gradient-to-br from-teal-50/30 via-white to-emerald-50/20 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-1 border-b border-teal-100/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="analytics-summary-heading" className="text-sm font-semibold tracking-tight text-foreground">
                Analytics summary
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{periodLabel} · {dateRangeLabel}</p>
            </div>
            {analyticsError ? (
              <p role="status" className="text-xs text-amber-800">
                {analyticsError}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-teal-100/40 md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
            <DashboardMetricCard label="Page Views" value={engagementTotals.page_views} icon={Eye} loading={analyticsLoading} layout="strip" />
            <DashboardMetricCard
              label="Unique Sessions"
              value={engagementTotals.unique_sessions}
              icon={Users}
              loading={analyticsLoading}
              layout="strip"
            />
            <DashboardMetricCard label="Total Clicks" value={engagementTotals.clicks} icon={MousePointerClick} loading={analyticsLoading} layout="strip" />
            <DashboardMetricCard label="CTA Clicks" value={engagementTotals.cta_clicks} icon={BarChart3} loading={analyticsLoading} layout="strip" />
            <DashboardMetricCard
              label="Form Submissions"
              value={engagementTotals.form_submissions}
              icon={FileInput}
              loading={analyticsLoading}
              layout="strip"
            />
            <DashboardMetricCard label="Sign-ins" value={engagementTotals.sign_ins} icon={LogIn} loading={analyticsLoading} layout="strip" />
          </div>
        </div>

        <DashboardSectionCard
          title="Traffic & engagement trend"
          description={`Page views, sessions, clicks, and form submissions — ${periodLabel.toLowerCase()}`}
          variant="analytics"
          icon={
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100/70 text-teal-700">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            </span>
          }
        >
          <TrafficTrendPanel points={trendPoints} loading={analyticsLoading} periodLabel={periodLabel} />
        </DashboardSectionCard>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <DashboardSectionCard title="Top accessed pages" description={periodLabel} variant="analytics">
            <TopAccessedPagesTable rows={topPages} loading={analyticsLoading} periodLabel={periodLabel} />
          </DashboardSectionCard>
          <DashboardSectionCard title="Top clicked CTAs" description={periodLabel} variant="analytics">
            <TopClickedCtasTable rows={topCtas} loading={analyticsLoading} periodLabel={periodLabel} />
          </DashboardSectionCard>
        </div>
      </section>

      {/* Operational panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <DashboardSectionCard
          id="needs-attention"
          title="Needs attention"
          description="Items that may require admin action"
          variant="attention"
          icon={
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100/70 text-amber-800">
              <Mail className="h-3.5 w-3.5" aria-hidden />
            </span>
          }
        >
          <NeedsAttentionPanel summary={summary} loading={loading} />
        </DashboardSectionCard>

        <div className="space-y-5">
          <DashboardSectionCard
            title="Upcoming events"
            description="Next published events on the calendar"
            variant="operational"
            icon={
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-kenyan-green-100/70 text-kenyan-green-800">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
              </span>
            }
            action={<UpcomingEventsPanelHeaderAction />}
          >
            <UpcomingEventsPanel events={upcoming} loading={loading} />
          </DashboardSectionCard>

          <DashboardSectionCard
            title="Recent activity"
            description="Latest platform records"
            variant="operational"
            icon={
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-kenyan-green-100/70 text-kenyan-green-800">
                <Megaphone className="h-3.5 w-3.5" aria-hidden />
              </span>
            }
            action={<RecentActivityPanelHeaderAction />}
          >
            <RecentActivityPanel items={recent} loading={loading} />
          </DashboardSectionCard>
        </div>
      </div>

      {!authLoading && isSuperAdmin ? (
        <PlatformOperationsSection
          infrastructure={infrastructure}
          loading={infrastructureLoading}
          error={infrastructureError}
          showSystemHealthLink={showSystemHealthLink}
        />
      ) : null}
    </div>
  )
}
