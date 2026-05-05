import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, LayoutDashboard, UserCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { KighLogo } from '@/components/KighLogo'
import { postLogoutPath } from '@/lib/logoutRedirect'
import { PRIMARY_NAV, MORE_NAV_GROUPS } from '@/lib/publicNav'

export function Header() {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate(postLogoutPath(location.pathname))
    setMobileOpen(false)
  }

  // The More button highlights as "active" when the current path is
  // any of the secondary destinations, so users get visual continuity
  // when they're inside e.g. Resources or Governance.
  const moreActive = MORE_NAV_GROUPS.some((g) =>
    g.items.some((i) => location.pathname.startsWith(i.to))
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-white/[0.97] backdrop-blur-md supports-[backdrop-filter]:bg-white/88 shadow-[0_1px_3px_rgba(15,40,25,0.06)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
          <KighLogo
            withCard
            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
            imgClassName="max-h-9 sm:max-h-10"
          />
          <span className="hidden font-bold text-primary sm:block leading-tight text-[15px] truncate">
            Kenyan Community
            <br />
            <span className="text-kenyan-gold-600 font-semibold text-[11px] tracking-wide uppercase">
              Houston · KIGH
            </span>
          </span>
        </Link>

        {/* Desktop nav. Five primary tabs + a single grouped More
            dropdown keeps the bar light at common laptop widths. */}
        <nav
          aria-label="Primary"
          className="hidden lg:flex items-center gap-1"
        >
          {PRIMARY_NAV.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1 px-3 py-2 text-sm font-medium rounded-md',
                  moreActive
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                )}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
              >
                More
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    moreOpen && 'rotate-180'
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-[18rem] p-2"
            >
              {MORE_NAV_GROUPS.map((group, idx) => (
                <div key={group.heading}>
                  {idx > 0 ? (
                    <DropdownMenuSeparator className="my-1.5" />
                  ) : null}
                  <DropdownMenuLabel className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.heading}
                  </DropdownMenuLabel>
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.to}
                      asChild
                      className="px-2 py-2 text-sm rounded-md cursor-pointer"
                    >
                      <Link to={item.to}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          {/* Primary public CTA — public visitors are encouraged to
              contribute events. Hidden below md to keep the bar tidy
              on small screens (still available in the mobile menu). */}
          <Button
            asChild
            size="sm"
            className="hidden md:inline-flex shrink-0"
            variant="default"
          >
            <Link to="/events/submit">Submit event</Link>
          </Button>
          {/* Admin login — visible on md+ so testers/staff can find it
              from any tablet or laptop without hunting in the footer.
              Styled secondary so it never competes with public CTAs. */}
          {(!user || !isAdmin) && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden md:inline-flex shrink-0 border-border/80 text-muted-foreground hover:text-foreground font-medium gap-1.5"
            >
              <Link to="/admin/login">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Admin login
              </Link>
            </Button>
          )}

          {user ? (
            <div className="hidden lg:flex items-center gap-1 shrink-0">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="whitespace-nowrap"
              >
                <Link to="/profile" className="gap-1.5">
                  <UserCircle className="h-4 w-4" />
                  My Profile
                </Link>
              </Button>
              {isAdmin ? (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Link to="/admin/dashboard" className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => void handleLogout()}
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : null}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden shrink-0"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 pt-10 flex flex-col">
              <nav
                aria-label="Mobile navigation"
                className="flex flex-col gap-1 flex-1 overflow-y-auto"
              >
                <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Explore
                </p>
                {PRIMARY_NAV.map((link) => (
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
                {MORE_NAV_GROUPS.map((group) => (
                  <div key={group.heading} className="mt-3">
                    <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.heading}
                    </p>
                    {group.items.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'px-4 py-2.5 text-[15px] font-medium rounded-md transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                          )
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                ))}
                <div className="mt-5 border-t pt-4 flex flex-col gap-2">
                  <Button
                    asChild
                    className="w-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/events/submit">Submit an event</Link>
                  </Button>
                  {(!user || !isAdmin) && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/admin/login">
                        <Lock className="h-4 w-4" />
                        Admin login
                      </Link>
                    </Button>
                  )}
                  {user ? (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Link to="/profile" className="gap-2">
                          <UserCircle className="h-4 w-4" />
                          My Profile
                        </Link>
                      </Button>
                      {isAdmin ? (
                        <Button
                          asChild
                          variant="outline"
                          className="w-full"
                          onClick={() => setMobileOpen(false)}
                        >
                          <Link to="/admin/dashboard" className="gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        className="w-full gap-2"
                        onClick={() => void handleLogout()}
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/login">Member login</Link>
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
