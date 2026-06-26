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
import { isSystemHealthAdminRole } from '@/lib/platformAdmin'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function AdminDashboardPage() {
  const { role } = useAuth()
  const isSuperAdmin = role === 'super_admin'
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
    if (!isSuperAdmin) {
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
  }, [isSuperAdmin])

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
    <div className="-mx-4 -my-4 min-h-full space-y-8 bg-[hsl(48_38%_97%)] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Header */}
      <header className="rounded-xl border border-border/70 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Community Platform Dashboard
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Operations and engagement overview of the community platform.
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              <span className="font-medium text-foreground">{periodLabel}</span>
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
                className="gap-2"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                aria-label="Refresh dashboard data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              <Button asChild variant="default" size="sm" className="gap-2">
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

      {/* Primary KPIs */}
      <section aria-labelledby="primary-kpis-heading">
        <h2 id="primary-kpis-heading" className="sr-only">
          Primary KPIs
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <AdminStatCard
            label="Total Members"
            value={summary?.members.total ?? 0}
            sublabel="Registered community members"
            href="/admin/members"
            icon={Users}
            loading={loading}
          />
          <AdminStatCard
            label="Active Members"
            value={summary?.members.approved ?? 0}
            sublabel="Approved memberships"
            href="/admin/members"
            icon={UserCheck}
            loading={loading}
          />
          <AdminStatCard
            label="Published Events"
            value={summary?.events.published ?? 0}
            sublabel={`${summary?.events.upcoming_published ?? 0} upcoming`}
            href="/admin/calendar"
            icon={Calendar}
            loading={loading}
          />
          <AdminStatCard
            label="Businesses Listed"
            value={summary?.businesses.published ?? 0}
            sublabel={`${summary?.businesses.pending ?? 0} pending review`}
            href="/admin/businesses"
            icon={Building2}
            loading={loading}
          />
          <AdminStatCard
            label="Live Fundraisers"
            value={summary?.fundraisers.live ?? 0}
            sublabel={`${summary?.fundraisers.pending ?? 0} pending review`}
            href="/admin/fundraisers"
            icon={Heart}
            loading={loading}
          />
          <AdminStatCard
            label="Pending Reviews"
            value={pendingReviews}
            sublabel="Content awaiting approval"
            href={pendingReviews > 0 ? '/admin/submissions?status=pending' : '/admin/submissions'}
            icon={ClipboardList}
            loading={loading}
            accent="warning"
          />
        </div>
      </section>

      {/* Secondary operational cards */}
      <section aria-labelledby="operational-kpis-heading">
        <h2 id="operational-kpis-heading" className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Operations
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <AdminStatCard
            label="Membership Applications"
            value={summary?.members.pending ?? 0}
            sublabel="Pending approval"
            href={summary && summary.members.pending > 0 ? '/admin/members?membershipStatus=pending' : '/admin/members'}
            icon={Users}
            loading={loading}
            accent="warning"
          />
          <AdminStatCard
            label="Contact Messages"
            value={summary?.contact_messages.new ?? 0}
            sublabel="Unread / new"
            href={summary && summary.contact_messages.new > 0 ? '/admin/contacts?status=new' : '/admin/contacts'}
            icon={MessageSquare}
            loading={loading}
            accent="warning"
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
          />
          <AdminStatCard
            label="Volunteer Signups"
            value={summary?.volunteers.submitted ?? 0}
            sublabel={`${summary?.volunteers.total ?? 0} total signups`}
            href="/admin/volunteers"
            icon={HeartHandshake}
            loading={loading}
          />
          <AdminStatCard
            label="Vendor Signups"
            value={summary?.vendors.submitted ?? 0}
            sublabel={`${summary?.vendors.total ?? 0} total signups`}
            href="/admin/vendors"
            icon={Store}
            loading={loading}
          />
          <AdminStatCard
            label="Poll Activity"
            value={summary?.polls.active ?? 0}
            sublabel={`${summary?.polls.votes_30d ?? 0} votes (30d)`}
            href="/admin/polls"
            icon={Vote}
            loading={loading}
          />
        </div>
      </section>

      {/* Analytics summary row */}
      <section aria-labelledby="analytics-summary-heading">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="analytics-summary-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Analytics summary
          </h2>
          {analyticsError ? (
            <p role="status" className="text-xs text-amber-800">
              {analyticsError}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <DashboardMetricCard label="Page Views" value={engagementTotals.page_views} icon={Eye} loading={analyticsLoading} />
          <DashboardMetricCard
            label="Unique Sessions"
            value={engagementTotals.unique_sessions}
            icon={Users}
            loading={analyticsLoading}
          />
          <DashboardMetricCard label="Total Clicks" value={engagementTotals.clicks} icon={MousePointerClick} loading={analyticsLoading} />
          <DashboardMetricCard label="CTA Clicks" value={engagementTotals.cta_clicks} icon={BarChart3} loading={analyticsLoading} />
          <DashboardMetricCard
            label="Form Submissions"
            value={engagementTotals.form_submissions}
            icon={FileInput}
            loading={analyticsLoading}
          />
          <DashboardMetricCard label="Sign-ins" value={engagementTotals.sign_ins} icon={LogIn} loading={analyticsLoading} />
        </div>
      </section>

      {/* Traffic trend */}
      <DashboardSectionCard
        title="Traffic & engagement trend"
        description={`Page views, sessions, clicks, and form submissions — ${periodLabel.toLowerCase()}`}
        icon={<BarChart3 className="h-4 w-4 text-primary" aria-hidden />}
      >
        <TrafficTrendPanel points={trendPoints} loading={analyticsLoading} periodLabel={periodLabel} />
      </DashboardSectionCard>

      {/* Top pages & CTAs */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardSectionCard title="Top accessed pages" description={periodLabel}>
          <TopAccessedPagesTable rows={topPages} loading={analyticsLoading} periodLabel={periodLabel} />
        </DashboardSectionCard>
        <DashboardSectionCard title="Top clicked CTAs" description={periodLabel}>
          <TopClickedCtasTable rows={topCtas} loading={analyticsLoading} periodLabel={periodLabel} />
        </DashboardSectionCard>
      </div>

      {/* Needs attention + side panels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardSectionCard
          id="needs-attention"
          title="Needs attention"
          description="Items that may require admin action"
          icon={<Mail className="h-4 w-4 text-amber-700" aria-hidden />}
          className="border-amber-200/50"
        >
          <NeedsAttentionPanel summary={summary} loading={loading} />
        </DashboardSectionCard>

        <div className="space-y-6">
          <DashboardSectionCard
            title="Upcoming events"
            description="Next published events on the calendar"
            icon={<Calendar className="h-4 w-4 text-primary" aria-hidden />}
            action={<UpcomingEventsPanelHeaderAction />}
          >
            <UpcomingEventsPanel events={upcoming} loading={loading} />
          </DashboardSectionCard>

          <DashboardSectionCard
            title="Recent activity"
            description="Latest platform records"
            icon={<Megaphone className="h-4 w-4 text-primary" aria-hidden />}
            action={<RecentActivityPanelHeaderAction />}
          >
            <RecentActivityPanel items={recent} loading={loading} />
          </DashboardSectionCard>
        </div>
      </div>

      {isSuperAdmin ? (
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
