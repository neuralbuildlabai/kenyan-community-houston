import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Megaphone, Building2, Heart, Image, Users, FileText, MessageSquare, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'

interface Stats {
  events: number
  announcements: number
  businesses: number
  fundraisers: number
  gallery_images: number
  contacts: number
  pending_events: number
  pending_announcements: number
  pending_businesses: number
  pending_fundraisers: number
}

interface RecentItem {
  id: string
  title: string
  status: string
  created_at: string
  type: string
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: events },
        { count: announcements },
        { count: businesses },
        { count: fundraisers },
        { count: gallery_images },
        { count: contacts },
        { count: pending_events },
        { count: pending_announcements },
        { count: pending_businesses },
        { count: pending_fundraisers },
        { data: recentEvents },
        { data: recentAnn },
      ] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('fundraisers').select('*', { count: 'exact', head: true }),
        supabase.from('gallery_images').select('*', { count: 'exact', head: true }),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('fundraisers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('events').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('announcements').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
      ])

      setStats({
        events: events ?? 0, announcements: announcements ?? 0,
        businesses: businesses ?? 0, fundraisers: fundraisers ?? 0,
        gallery_images: gallery_images ?? 0, contacts: contacts ?? 0,
        pending_events: pending_events ?? 0,
        pending_announcements: pending_announcements ?? 0,
        pending_businesses: pending_businesses ?? 0,
        pending_fundraisers: pending_fundraisers ?? 0,
      })

      const combined: RecentItem[] = [
        ...(recentEvents ?? []).map((e) => ({ ...e, type: 'Event' })),
        ...(recentAnn ?? []).map((a) => ({ ...a, type: 'Announcement' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8)
      setRecent(combined)
      setLoading(false)
    }
    load()
  }, [])

  const statCards = stats ? [
    { label: 'Events', value: stats.events, pending: stats.pending_events, icon: Calendar, href: '/admin/events', color: 'text-blue-600' },
    { label: 'Announcements', value: stats.announcements, pending: stats.pending_announcements, icon: Megaphone, href: '/admin/announcements', color: 'text-green-600' },
    { label: 'Businesses', value: stats.businesses, pending: stats.pending_businesses, icon: Building2, href: '/admin/businesses', color: 'text-orange-600' },
    { label: 'Fundraisers', value: stats.fundraisers, pending: stats.pending_fundraisers, icon: Heart, href: '/admin/fundraisers', color: 'text-red-600' },
    { label: 'Gallery Images', value: stats.gallery_images, pending: 0, icon: Image, href: '/admin/gallery', color: 'text-purple-600' },
    { label: 'Contact Messages', value: stats.contacts, pending: 0, icon: MessageSquare, href: '/admin/contacts', color: 'text-teal-600' },
  ] : []

  const totalPending = stats
    ? stats.pending_events + stats.pending_announcements + stats.pending_businesses + stats.pending_fundraisers
    : 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Community platform overview</p>
        </div>
        {totalPending > 0 && (
          <Link to="/admin/submissions" className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 hover:bg-amber-100 transition-colors">
            <Clock className="h-4 w-4" />
            {totalPending} pending review
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <Link key={card.label} to={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                    <card.icon className={`h-6 w-6 ${card.color} mt-1`} />
                  </div>
                  {card.pending > 0 && (
                    <div className="mt-3">
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                        {card.pending} pending
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
            ) : recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent submissions.</p>
            ) : (
              <div className="divide-y">
                {recent.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.type} · {formatDateShort(item.created_at)}</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Review Submissions', href: '/admin/submissions', icon: FileText },
                { label: 'Manage Events', href: '/admin/events', icon: Calendar },
                { label: 'Manage Businesses', href: '/admin/businesses', icon: Building2 },
                { label: 'Gallery Upload', href: '/admin/gallery', icon: Image },
                { label: 'View Contacts', href: '/admin/contacts', icon: MessageSquare },
                { label: 'Settings', href: '/admin/settings', icon: Users },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.href}
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
