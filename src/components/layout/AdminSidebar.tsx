import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  Building2,
  Heart,
  Image,
  MessageSquare,
  Inbox,
  Settings,
  Users,
  ChevronRight,
  FolderOpen,
  UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { APP_NAME } from '@/lib/constants'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/admin/calendar', label: 'Calendar', Icon: CalendarDays },
  { to: '/admin/resources', label: 'Resources', Icon: FolderOpen },
  { to: '/admin/members', label: 'Members', Icon: UserPlus },
  { to: '/admin/announcements', label: 'Announcements', Icon: Megaphone },
  { to: '/admin/businesses', label: 'Businesses', Icon: Building2 },
  { to: '/admin/fundraisers', label: 'Fundraisers', Icon: Heart },
  { to: '/admin/gallery', label: 'Gallery', Icon: Image },
  { to: '/admin/submissions', label: 'Public Submissions', Icon: Inbox },
  { to: '/admin/contacts', label: 'Contact Submissions', Icon: MessageSquare },
  { to: '/admin/settings', label: 'Site Settings', Icon: Settings },
  { to: '/admin/users', label: 'Admin Users', Icon: Users },
]

export function AdminSidebar() {
  const { profile } = useAuth()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-foreground text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
          KCH
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">Admin Portal</div>
          <div className="text-xs text-white/50 truncate">Kenyan Community Houston</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-3 w-3 opacity-40" />
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile */}
      {profile && (
        <div className="border-t border-white/10 p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kenyan-gold-600 text-white text-xs font-semibold">
              {profile.full_name?.[0] ?? profile.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {profile.full_name ?? 'Admin User'}
              </div>
              <div className="text-xs text-white/50 capitalize truncate">{profile.role.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
