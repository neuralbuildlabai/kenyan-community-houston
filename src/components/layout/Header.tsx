import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { KighLogo } from '@/components/KighLogo'

const navLinks = [
  { to: '/events', label: 'Events' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/businesses', label: 'Businesses' },
  { to: '/community-support', label: 'Community Support' },
  { to: '/sports-youth', label: 'Sports & Youth' },
  { to: '/gallery', label: 'Gallery' },
]

const moreLinks = [
  { to: '/membership', label: 'Membership' },
  { to: '/serve', label: 'Call to Serve' },
  { to: '/support', label: 'Support KIGH' },
  { to: '/resources', label: 'Resources' },
  { to: '/community-groups', label: 'Community Groups' },
  { to: '/governance', label: 'Governance' },
  { to: '/new-to-houston', label: 'New to Houston' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function Header() {
  const { isAdmin, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
          <KighLogo withCard className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" imgClassName="max-h-9 sm:max-h-10" />
          <span className="hidden font-bold text-primary sm:block leading-tight text-[15px] truncate">
            Kenyan Community<br />
            <span className="text-kenyan-gold-600 font-semibold text-xs">Houston · KIGH</span>
          </span>
        </Link>

        <nav className="hidden xl:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'px-2.5 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 ml-0.5">
                More <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              {moreLinks.map((link) => (
                <DropdownMenuItem key={link.to} asChild>
                  <Link to={link.to}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" className="hidden sm:inline-flex" variant="default">
            <Link to="/events/submit">Submit event</Link>
          </Button>

          {isAdmin && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold">
                    {profile.full_name?.[0] ?? profile.email[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm">{profile.full_name?.split(' ')[0] ?? 'Admin'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/admin/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 pt-10">
              <nav className="flex flex-col gap-1">
                {[...navLinks, ...moreLinks].map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'px-4 py-3 text-base font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="mt-4 border-t pt-4 flex flex-col gap-2">
                  <Button asChild className="w-full" onClick={() => setMobileOpen(false)}>
                    <Link to="/events/submit">Submit an event</Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                      <Link to="/admin/dashboard">Admin dashboard</Link>
                    </Button>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
