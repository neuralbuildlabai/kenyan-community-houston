import { useEffect, useState } from 'react'
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
import {
  MORE_NAV_GROUPS,
  COMMUNITY_MENU,
  RESOURCES_MENU,
  JOIN_MEMBERSHIP_ITEM,
} from '@/lib/publicNav'
import type { NavItem } from '@/lib/publicNav'

function pathMatchesMenu(pathname: string, items: ReadonlyArray<NavItem>): boolean {
  return items.some(
    (i) => pathname === i.to || (i.to !== '/' && pathname.startsWith(`${i.to}/`))
  )
}

export function Header() {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [solidNav, setSolidNav] = useState(false)

  const isHome = location.pathname === '/'

  useEffect(() => {
    if (!isHome) {
      setSolidNav(false)
      return
    }
    const onScroll = () => {
      setSolidNav(window.scrollY > 32)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  async function handleLogout() {
    await signOut()
    navigate(postLogoutPath(location.pathname))
    setMobileOpen(false)
  }

  const moreActive = MORE_NAV_GROUPS.some((g) =>
    g.items.some((i) => location.pathname === i.to || location.pathname.startsWith(`${i.to}/`))
  )
  const communityActive = pathMatchesMenu(location.pathname, COMMUNITY_MENU)
  const resourcesActive = pathMatchesMenu(location.pathname, RESOURCES_MENU)

  const overlayHeader = isHome && !solidNav

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'px-3 py-2 text-sm font-medium rounded-md transition-colors',
      overlayHeader
        ? isActive
          ? 'bg-white/15 text-white'
          : 'text-white/85 hover:text-white hover:bg-white/10'
        : isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground/70 hover:text-foreground hover:bg-muted'
    )

  const dropdownTriggerClass = (active: boolean) =>
    cn(
      'gap-1 px-3 py-2 text-sm font-medium rounded-md h-auto',
      overlayHeader
        ? active
          ? 'bg-white/15 text-white hover:bg-white/15 hover:text-white'
          : 'text-white/85 hover:text-white hover:bg-white/10'
        : active
          ? 'bg-primary/10 text-primary hover:bg-primary/15'
          : 'text-foreground/70 hover:text-foreground hover:bg-muted'
    )

  const headerSurface = overlayHeader
    ? 'border-b border-white/15 bg-black/30 shadow-none backdrop-blur-md supports-[backdrop-filter]:bg-black/25'
    : 'border-b border-border/50 bg-white/[0.97] backdrop-blur-md supports-[backdrop-filter]:bg-white/88 shadow-[0_1px_3px_rgba(15,40,25,0.06)]'

  const brandTitleClass = overlayHeader
    ? 'hidden font-bold text-white sm:block leading-tight text-[15px] truncate'
    : 'hidden font-bold text-primary sm:block leading-tight text-[15px] truncate'

  const brandSubtitleClass = overlayHeader
    ? 'text-amber-200/95 font-semibold text-[11px] tracking-wide uppercase'
    : 'text-kenyan-gold-600 font-semibold text-[11px] tracking-wide uppercase'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-[background-color,box-shadow,border-color] duration-300',
        headerSurface
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
          <KighLogo
            withCard
            className={cn(
              'h-10 w-10 sm:h-11 sm:w-11 shrink-0',
              overlayHeader && 'border-white/25 bg-white/95 shadow-md ring-0'
            )}
            imgClassName="max-h-9 sm:max-h-10"
          />
          <span className={brandTitleClass}>
            Kenyan Community
            <br />
            <span className={brandSubtitleClass}>Houston · KIGH</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5">
          <NavLink to="/events" className={navLinkClass}>
            Events
          </NavLink>

          <DropdownMenu open={communityOpen} onOpenChange={setCommunityOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={dropdownTriggerClass(communityActive)}
                aria-haspopup="menu"
                aria-expanded={communityOpen}
              >
                Community
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', communityOpen && 'rotate-180')}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-[17rem] p-2">
              <DropdownMenuLabel className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Community
              </DropdownMenuLabel>
              {COMMUNITY_MENU.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="px-2 py-2 text-sm rounded-md cursor-pointer">
                  <Link to={item.to} onClick={() => setCommunityOpen(false)}>
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={resourcesOpen} onOpenChange={setResourcesOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={dropdownTriggerClass(resourcesActive)}
                aria-haspopup="menu"
                aria-expanded={resourcesOpen}
              >
                Resources
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', resourcesOpen && 'rotate-180')}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-[17rem] p-2">
              <DropdownMenuLabel className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Resources
              </DropdownMenuLabel>
              {RESOURCES_MENU.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="px-2 py-2 text-sm rounded-md cursor-pointer">
                  <Link to={item.to} onClick={() => setResourcesOpen(false)}>
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink to="/gallery" className={navLinkClass}>
            Gallery
          </NavLink>

          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={dropdownTriggerClass(moreActive)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
              >
                More
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', moreOpen && 'rotate-180')} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-[18rem] p-2">
              {MORE_NAV_GROUPS.map((group, idx) => (
                <div key={group.heading}>
                  {idx > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}
                  <DropdownMenuLabel className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.heading}
                  </DropdownMenuLabel>
                  {group.items.map((item) => (
                    <DropdownMenuItem key={item.to} asChild className="px-2 py-2 text-sm rounded-md cursor-pointer">
                      <Link to={item.to} onClick={() => setMoreOpen(false)}>
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            asChild
            size="sm"
            className={cn(
              'ml-1 shrink-0 font-semibold shadow-sm',
              overlayHeader && 'bg-kenyan-gold-500 text-white hover:bg-kenyan-gold-400 border-0'
            )}
          >
            <Link to={JOIN_MEMBERSHIP_ITEM.to}>{JOIN_MEMBERSHIP_ITEM.label}</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          <Button
            asChild
            size="sm"
            variant={overlayHeader ? 'secondary' : 'default'}
            className={cn(
              'hidden md:inline-flex shrink-0',
              overlayHeader &&
                'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm'
            )}
          >
            <Link to="/events/submit">Submit event</Link>
          </Button>
          {!user && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className={cn(
                'hidden md:inline-flex shrink-0 font-medium gap-1.5',
                overlayHeader
                  ? 'border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white'
                  : 'border-border/80 text-muted-foreground hover:text-foreground'
              )}
            >
              <Link to="/login">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Login
              </Link>
            </Button>
          )}

          {user ? (
            <div className="hidden lg:flex items-center gap-1 shrink-0">
              <Button asChild variant="ghost" size="sm" className={cn('whitespace-nowrap', overlayHeader && 'text-white hover:bg-white/10 hover:text-white')}>
                <Link to="/profile" className="gap-1.5">
                  <UserCircle className="h-4 w-4" />
                  My Profile
                </Link>
              </Button>
              {isAdmin ? (
                <Button asChild variant="ghost" size="sm" className={cn('whitespace-nowrap', overlayHeader && 'text-white hover:bg-white/10 hover:text-white')}>
                  <Link to="/admin/dashboard" className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'whitespace-nowrap',
                  overlayHeader &&
                    'border-white/35 text-white hover:bg-white/10 hover:text-white bg-transparent'
                )}
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
                className={cn('lg:hidden shrink-0', overlayHeader && 'text-white hover:bg-white/10')}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 pt-10 flex flex-col">
              <nav aria-label="Mobile navigation" className="flex flex-col gap-1 flex-1 overflow-y-auto">
                <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Explore
                </p>
                <NavLink
                  to="/events"
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
                  Events
                </NavLink>
                <div className="mt-3">
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Community
                  </p>
                  {COMMUNITY_MENU.map((link) => (
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
                <div className="mt-3">
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Resources
                  </p>
                  {RESOURCES_MENU.map((link) => (
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
                <NavLink
                  to="/gallery"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'mt-1 px-4 py-3 text-base font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  Gallery
                </NavLink>
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
                  <Button asChild className="w-full" onClick={() => setMobileOpen(false)}>
                    <Link to={JOIN_MEMBERSHIP_ITEM.to}>{JOIN_MEMBERSHIP_ITEM.label}</Link>
                  </Button>
                  <Button asChild className="w-full" variant="secondary" onClick={() => setMobileOpen(false)}>
                    <Link to="/events/submit">Submit an event</Link>
                  </Button>
                  {!user && (
                    <Button asChild variant="outline" className="w-full gap-2" onClick={() => setMobileOpen(false)}>
                      <Link to="/login">
                        <Lock className="h-4 w-4" />
                        Login
                      </Link>
                    </Button>
                  )}
                  {user ? (
                    <>
                      <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                        <Link to="/profile" className="gap-2">
                          <UserCircle className="h-4 w-4" />
                          My Profile
                        </Link>
                      </Button>
                      {isAdmin ? (
                        <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                          <Link to="/admin/dashboard" className="gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        </Button>
                      ) : null}
                      <Button variant="secondary" className="w-full gap-2" onClick={() => void handleLogout()}>
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : null}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
