import type { LucideIcon } from 'lucide-react'
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
  UsersRound,
  HeartHandshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { APP_NAME } from '@/lib/constants'

type NavItem = { to: string; label: string; Icon: LucideIcon }

const navGroups: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [{ to: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard }],
  },
  {
    heading: 'KIGH',
    items: [
      { to: '/admin/calendar', label: 'Calendar', Icon: CalendarDays },
      { to: '/admin/resources', label: 'Resources', Icon: FolderOpen },
      { to: '/admin/members', label: 'Members', Icon: UserPlus },
    ],
  },
  {
    heading: 'Content',
    items: [
      { to: '/admin/announcements', label: 'Announcements', Icon: Megaphone },
      { to: '/admin/businesses', label: 'Businesses', Icon: Building2 },
      { to: '/admin/community-groups', label: 'Community groups', Icon: UsersRound },
      { to: '/admin/fundraisers', label: 'Fundraisers', Icon: Heart },
      { to: '/admin/gallery', label: 'Gallery', Icon: Image },
    ],
  },
  {
    heading: 'Inbox',
    items: [
      { to: '/admin/submissions', label: 'Public submissions', Icon: Inbox },
      { to: '/admin/contacts', label: 'Contact messages', Icon: MessageSquare },
      { to: '/admin/service-interests', label: 'Call to Serve', Icon: HeartHandshake },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/admin/settings', label: 'Site settings', Icon: Settings },
      { to: '/admin/users', label: 'Admin users', Icon: Users },
    ],
  },
]

export function AdminSidebar() {
  const { profile } = useAuth()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-foreground text-white">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
          KCH
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">Admin</div>
          <div className="text-xs text-white/50 truncate">{APP_NAME}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.heading} className="mb-4 last:mb-0">
            <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {group.heading}
            </div>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" />
                    <span className="flex-1 leading-snug">{label}</span>
                    <ChevronRight className="h-3 w-3 opacity-35 shrink-0" />
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

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
