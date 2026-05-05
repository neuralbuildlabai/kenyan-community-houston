import { useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { StagingBanner } from '@/components/StagingBanner'
import { AnalyticsRouteListener } from '@/components/AnalyticsRouteListener'

const ADMIN_CHANGE_PASSWORD_PATH = '/admin/change-password'

const ROUTE_LABELS: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/calendar': 'Calendar',
  '/admin/resources': 'Resources',
  '/admin/members': 'Members',
  '/admin/community-groups': 'Community groups',
  '/admin/announcements': 'Announcements',
  '/admin/businesses': 'Businesses',
  '/admin/fundraisers': 'Fundraisers',
  '/admin/gallery': 'Gallery',
  '/admin/submissions': 'Public submissions',
  '/admin/contacts': 'Contact messages',
  '/admin/service-interests': 'Call to Serve',
  '/admin/media-submissions': 'Media submissions',
  '/admin/settings': 'Site settings',
  '/admin/users': 'Admin users',
  '/admin/analytics': 'Analytics',
  '/admin/system-health': 'System Health',
  '/admin/change-password': 'Change password',
}

function mobilePageTitle(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  const tail = pathname.replace(/^\/admin\/?/, '')
  if (!tail) return 'Admin'
  return tail
    .split('/')
    .map((s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' · ')
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const mobileTitle = useMemo(() => mobilePageTitle(location.pathname), [location.pathname])
  const { adminGateLoading, adminPasswordGate } = useAuth()

  /** ProtectedRoute already waits on session `loading`; gate spinner is only for admin security. */
  const gatePending = adminGateLoading
  const onChangePasswordPage = location.pathname === ADMIN_CHANGE_PASSWORD_PATH
  const mustRedirect = !gatePending && adminPasswordGate.required && !onChangePasswordPage

  if (mustRedirect) {
    return <Navigate to={ADMIN_CHANGE_PASSWORD_PATH} replace state={{ reason: adminPasswordGate.reason }} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col">
      <AnalyticsRouteListener />
      <StagingBanner />
      <div className="flex flex-1 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex lg:hidden transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-4 text-white hover:bg-white/10"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex h-16 items-center gap-3 border-b bg-white px-4 lg:hidden min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSidebarOpen(true)} aria-label="Open admin menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-foreground truncate">{mobileTitle}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">KCH Admin</div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {gatePending && !onChangePasswordPage ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}
