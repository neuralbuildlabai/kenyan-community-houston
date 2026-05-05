import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Megaphone,
  Building2,
  Heart,
  Image,
  MessageSquare,
  TrendingUp,
  Clock,
  Users,
  Inbox,
  BarChart3,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { format } from 'date-fns'
import { SimpleBars, type BarDatum } from '@/components/admin/SimpleBars'

interface Stats {
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

interface RecentItem {
  id: string
  title: string
  status: string
  created_at: string
  type: string
}

type Summary7 = {
  page_views?: number
  cta_clicks?: number
  entity_views?: number
  entity_clicks?: number
  logins?: number
  map_opens?: number
  submissions_logged?: number
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [upcoming, setUpcoming] = useState<{ id: string; title: string; start_date: string; location: string }[]>([])
  const [weekActivity, setWeekActivity] = useState<BarDatum[]>([])
  const [summary7, setSummary7] = useState<Summary7 | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const todayYmd = format(new Date(), 'yyyy-MM-dd')
      const [
        { count: members_total },
        { count: members_pending },
        { count: events_published },
        { count: events_pending },
        { count: announcements_published },
        { count: announcements_pending },
        { count: businesses_published },
        { count: businesses_pending },
        { count: fundraisers_active },
        { count: fundraisers_pending },
        { count: gallery_pending },
        { count: media_submissions_pending },
        { count: contacts_new },
        { count: profiles_total },
        { data: recentEvents },
        { data: recentAnn },
        { data: recentBiz },
        { data: recentFund },
        { data: upcomingRows },
        { data: rpcWeekData, error: rpcWeekError },
        { data: rpcSummaryData, error: rpcSummaryError },
      ] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('membership_status', 'pending'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('fundraisers').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('fundraisers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('gallery_images').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('member_media_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('announcements').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('businesses').select('id, name, status, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('fundraisers').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(3),
        supabase
          .from('events')
          .select('id, title, start_date, location')
          .eq('status', 'published')
          .gte('start_date', todayYmd)
          .order('start_date', { ascending: true })
          .limit(5),
        supabase.rpc('kigh_admin_engagement_by_week', { p_weeks: 4 }),
        supabase.rpc('kigh_admin_analytics_summary', { p_days: 7 }),
      ])

      setStats({
        members_total: members_total ?? 0,
        members_pending: members_pending ?? 0,
        events_published: events_published ?? 0,
        events_pending: events_pending ?? 0,
        announcements_published: announcements_published ?? 0,
        announcements_pending: announcements_pending ?? 0,
        businesses_published: businesses_published ?? 0,
        businesses_pending: businesses_pending ?? 0,
        fundraisers_active: fundraisers_active ?? 0,
        fundraisers_pending: fundraisers_pending ?? 0,
        gallery_pending: gallery_pending ?? 0,
        media_submissions_pending: media_submissions_pending ?? 0,
        contacts_new: contacts_new ?? 0,
        profiles_total: profiles_total ?? 0,
      })

      const combined: RecentItem[] = [
        ...(recentEvents ?? []).map((e) => ({ ...e, type: 'Event' })),
        ...(recentAnn ?? []).map((a) => ({ ...a, type: 'Announcement' })),
        ...(recentBiz ?? []).map((b) => ({ id: b.id, title: b.name, status: b.status, created_at: b.created_at, type: 'Business' })),
        ...(recentFund ?? []).map((f) => ({ ...f, type: 'Fundraiser' })),
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      setRecent(combined)
      setUpcoming((upcomingRows ?? []) as { id: string; title: string; start_date: string; location: string }[])

      if (!rpcWeekError && Array.isArray(rpcWeekData)) {
        const rows = rpcWeekData as {
          week_start: string
          page_views: number
          clicks: number
          entity_views: number
          logins: number
          submissions: number
        }[]
        setWeekActivity(
          rows.map((r) => ({
            label: r.week_start,
            value: r.page_views + r.clicks + r.entity_views + r.logins + r.submissions,
            sub: `${r.page_views} views · ${r.clicks} clicks`,
          }))
        )
      } else {
        setWeekActivity([])
      }

      if (!rpcSummaryError && rpcSummaryData && typeof rpcSummaryData === 'object') {
        setSummary7(rpcSummaryData as Summary7)
      } else {
        setSummary7(null)
      }

      setLoading(false)
    }
    void load()
  }, [])

  const totalPendingReview =
    (stats?.events_pending ?? 0) +
    (stats?.announcements_pending ?? 0) +
    (stats?.businesses_pending ?? 0) +
    (stats?.fundraisers_pending ?? 0)

  const needsAttention =
    (stats?.members_pending ?? 0) +
    totalPendingReview +
    (stats?.gallery_pending ?? 0) +
    (stats?.media_submissions_pending ?? 0) +
    (stats?.contacts_new ?? 0)

  const statTiles = stats
    ? [
        { label: 'Members', value: stats.members_total, sub: `${stats.members_pending} pending apps`, href: '/admin/members', Icon: Users },
        { label: 'Profiles (accounts)', value: stats.profiles_total, sub: 'Directory accounts', href: '/admin/users', Icon: Users },
        { label: 'Events published', value: stats.events_published, sub: `${stats.events_pending} pending`, href: '/admin/calendar', Icon: Calendar },
        { label: 'Announcements', value: stats.announcements_published, sub: `${stats.announcements_pending} pending`, href: '/admin/announcements', Icon: Megaphone },
        { label: 'Businesses listed', value: stats.businesses_published, sub: `${stats.businesses_pending} pending`, href: '/admin/businesses', Icon: Building2 },
        { label: 'Fundraisers live', value: stats.fundraisers_active, sub: `${stats.fundraisers_pending} pending`, href: '/admin/fundraisers', Icon: Heart },
        { label: 'Gallery pending', value: stats.gallery_pending, sub: 'Images awaiting review', href: '/admin/gallery', Icon: Image },
        { label: 'Media submissions', value: stats.media_submissions_pending, sub: 'Member uploads', href: '/admin/media-submissions', Icon: Image },
        { label: 'New contact messages', value: stats.contacts_new, sub: 'Status = new', href: '/admin/contacts', Icon: MessageSquare },
      ]
    : []

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-[hsl(48_38%_97%)] via-card to-muted/30 px-5 py-7 sm:px-8 sm:py-8 shadow-sm">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.06] blur-2xl pointer-events-none" aria-hidden />
        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Operations overview
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              A calm snapshot of the community platform — what is live, what needs a human decision, and how people engaged this week.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {needsAttention > 0 && (
              <Button asChild variant="default" className="gap-2 shadow-md">
                <Link to="/admin/submissions">
                  <Clock className="h-4 w-4" />
                  {needsAttention} items need attention
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="gap-2 border-primary/25 bg-background/80">
              <Link to="/admin/analytics">
                <BarChart3 className="h-4 w-4" />
                Full analytics
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statTiles.map((card) => (
            <Link key={card.label} to={card.href}>
              <Card className="h-full hover:shadow-md transition-all border-border/80 hover:border-primary/25 bg-card/95">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
                      <p className="text-2xl sm:text-3xl font-bold mt-1.5 tabular-nums">{card.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{card.sub}</p>
                    </div>
                    <card.Icon className="h-6 w-6 text-primary/80 shrink-0 mt-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-amber-200/60 bg-gradient-to-br from-amber-50/90 via-card to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4 text-amber-700" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
            <AttentionRow label="Pending submissions (events, announcements, businesses, fundraisers)" value={totalPendingReview} href="/admin/submissions" />
            <AttentionRow label="Pending membership applications" value={stats?.members_pending ?? 0} href="/admin/members" />
            <AttentionRow label="Gallery / image queue" value={stats?.gallery_pending ?? 0} href="/admin/gallery" />
            <AttentionRow label="Member media submissions" value={stats?.media_submissions_pending ?? 0} href="/admin/media-submissions" />
            <AttentionRow label="Unread contact messages" value={stats?.contacts_new ?? 0} href="/admin/contacts" />
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-b from-primary/[0.04] to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> This week (analytics)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {summary7 ? (
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex justify-between gap-2">
                  <span>Page views</span>
                  <span className="font-semibold text-foreground tabular-nums">{summary7.page_views ?? 0}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Clicks (CTA + entity)</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {(summary7.cta_clicks ?? 0) + (summary7.entity_clicks ?? 0)}
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Logins recorded</span>
                  <span className="font-semibold text-foreground tabular-nums">{summary7.logins ?? 0}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Submissions logged</span>
                  <span className="font-semibold text-foreground tabular-nums">{summary7.submissions_logged ?? 0}</span>
                </li>
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs leading-relaxed">
                Apply migration <span className="font-mono">024</span> to enable weekly analytics summaries, or sign in with an elevated admin role.
              </p>
            )}
            {weekActivity.length > 0 ? (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Engagement by week</p>
                <SimpleBars data={weekActivity} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Upcoming events
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary">
              <Link to="/admin/calendar">
                Manage <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming published events in the next window.</p>
            ) : (
              <ul className="divide-y text-sm">
                {upcoming.map((e) => (
                  <li key={e.id} className="py-2.5 flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{e.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateShort(e.start_date)} · {e.location}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Recent submissions
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary">
              <Link to="/admin/submissions">
                Queue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent rows.</p>
            ) : (
              <div className="divide-y">
                {recent.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type} · {formatDateShort(item.created_at)}
                      </p>
                    </div>
                    <Badge variant={item.status === 'published' ? 'default' : item.status === 'pending' ? 'outline' : 'secondary'} className="shrink-0 text-xs">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shortcuts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Review submissions', href: '/admin/submissions' },
              { label: 'Calendar', href: '/admin/calendar' },
              { label: 'Members', href: '/admin/members' },
              { label: 'Contacts', href: '/admin/contacts' },
              { label: 'Media queue', href: '/admin/media-submissions' },
              { label: 'Analytics', href: '/admin/analytics' },
            ].map((a) => (
              <Link
                key={a.href}
                to={a.href}
                className="flex items-center justify-center rounded-xl border border-border/70 bg-muted/10 px-3 py-3 text-center text-xs font-medium hover:bg-muted/25 hover:border-primary/25 transition-colors"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AttentionRow({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 hover:border-primary/25 transition-colors"
    >
      <span className="text-muted-foreground leading-snug">{label}</span>
      <span className="text-lg font-bold tabular-nums shrink-0">{value}</span>
    </Link>
  )
}
