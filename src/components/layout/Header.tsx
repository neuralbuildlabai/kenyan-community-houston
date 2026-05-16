import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, ChevronDown, LogOut, LayoutDashboard, UserCircle, Lock, Home } from 'lucide-react'
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
  PRIMARY_NAV,
} from '@/lib/publicNav'
import type { NavItem } from '@/lib/publicNav'

const dropdownPanelClass =
  'z-50 min-w-[16rem] rounded-2xl border border-border/50 bg-popover p-2.5 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out'

const dropdownItemClass =
  'cursor-pointer rounded-lg px-3 py-2.5 text-[15px] leading-snug focus:bg-primary/8'

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
      'whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium tracking-tight transition-colors xl:text-sm',
      overlayHeader
        ? isActive
          ? 'bg-white/15 text-white'
          : 'text-white/88 hover:bg-white/10 hover:text-white'
        : isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground/75 hover:bg-muted/80 hover:text-foreground'
    )

  const dropdownTriggerClass = (active: boolean) =>
    cn(
      'h-auto gap-1 rounded-lg px-3 py-2 text-[13px] font-medium tracking-tight xl:text-sm',
      overlayHeader
        ? active
          ? 'bg-white/15 text-white hover:bg-white/15 hover:text-white'
          : 'text-white/88 hover:bg-white/10 hover:text-white'
        : active
          ? 'bg-primary/10 text-primary hover:bg-primary/15'
          : 'text-foreground/75 hover:bg-muted/80 hover:text-foreground'
    )

  const headerSurface = overlayHeader
    ? 'border-b border-white/12 bg-black/35 shadow-none backdrop-blur-lg supports-[backdrop-filter]:bg-black/28'
    : 'border-b border-border/40 bg-white/[0.98] shadow-[0_1px_0_rgba(15,40,25,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/92'

  const brandBlock = (
    <div className="hidden min-[400px]:flex min-w-0 flex-col leading-tight">
      <span
        className={cn(
          'truncate font-semibold tracking-tight text-[0.9rem] sm:text-[0.95rem]',
          overlayHeader ? 'text-white' : 'text-primary'
        )}
      >
        Kenyan Community Houston
      </span>
      <span
        className={cn(
          'truncate text-[11px] font-medium uppercase tracking-[0.12em]',
          overlayHeader ? 'text-white/72' : 'text-muted-foreground'
        )}
      >
        Kenyans in Greater Houston
      </span>
    </div>
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-[background-color,box-shadow,border-color] duration-300',
        headerSurface
      )}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-[90rem] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
          <KighLogo
            withCard
            className={cn(
              'h-10 w-10 shrink-0 sm:h-11 sm:w-11',
              overlayHeader && 'border-white/30 bg-white shadow-md ring-0'
            )}
            imgClassName="max-h-9 sm:max-h-10"
          />
          {brandBlock}
        </Link>

        <nav aria-label="Primary" className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 px-2 xl:flex">
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
                  className={cn('h-3.5 w-3.5 opacity-80 transition-transform', communityOpen && 'rotate-180')}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={10} className={dropdownPanelClass}>
              <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Community
              </DropdownMenuLabel>
              {COMMUNITY_MENU.map((item) => (
                <DropdownMenuItem key={item.to} asChild className={dropdownItemClass}>
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
                  className={cn('h-3.5 w-3.5 opacity-80 transition-transform', resourcesOpen && 'rotate-180')}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={10} className={dropdownPanelClass}>
              <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Resources
              </DropdownMenuLabel>
              {RESOURCES_MENU.map((item) => (
                <DropdownMenuItem key={item.label + item.to} asChild className={dropdownItemClass}>
                  <Link to={item.to} onClick={() => setResourcesOpen(false)}>
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {PRIMARY_NAV.filter((p) => p.to !== '/events').map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}

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
                <ChevronDown className={cn('h-3.5 w-3.5 opacity-80 transition-transform', moreOpen && 'rotate-180')} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className={cn(dropdownPanelClass, 'min-w-[18rem]')}>
              {MORE_NAV_GROUPS.map((group, idx) => (
                <div key={group.heading}>
                  {idx > 0 ? <DropdownMenuSeparator className="my-2 bg-border/60" /> : null}
                  <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.heading}
                  </DropdownMenuLabel>
                  {group.items.map((item) => (
                    <DropdownMenuItem key={item.to} asChild className={dropdownItemClass}>
                      <Link to={item.to} onClick={() => setMoreOpen(false)}>
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          <div className="hidden items-center gap-2 xl:flex">
            <Button
              asChild
              size="sm"
              variant="gold"
              className={cn('shrink-0 px-5 font-semibold shadow-sm', overlayHeader && 'shadow-md')}
            >
              <Link to={JOIN_MEMBERSHIP_ITEM.to}>{JOIN_MEMBERSHIP_ITEM.label}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={overlayHeader ? 'secondary' : 'outline'}
              className={cn(
                'shrink-0 font-medium',
                overlayHeader &&
                  'border-white/35 bg-white/10 text-white hover:bg-white/18 hover:text-white backdrop-blur-sm'
              )}
            >
              <Link to="/events/submit">Submit Event</Link>
            </Button>
            {!user && (
              <Button
                asChild
                size="sm"
                variant="ghost"
                className={cn(
                  'shrink-0 gap-1.5 font-medium',
                  overlayHeader ? 'text-white hover:bg-white/10 hover:text-white' : 'text-foreground/80'
                )}
              >
                <Link to="/login" data-testid="header-login">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Login
                </Link>
              </Button>
            )}
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="header-account"
                  className={cn(
                    'shrink-0 gap-1.5 font-medium',
                    overlayHeader && 'text-white hover:bg-white/10 hover:text-white'
                  )}
                >
                  <UserCircle className="h-4 w-4" />
                  <span className="hidden min-[400px]:inline">Account</span>
                  <span className="min-[400px]:hidden">My account</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className={dropdownPanelClass}>
                <DropdownMenuLabel className="px-3 pb-1 text-xs text-muted-foreground">My account</DropdownMenuLabel>
                <DropdownMenuItem asChild className={dropdownItemClass}>
                  <Link to="/" className="flex items-center gap-2">
                    <Home className="h-4 w-4 opacity-70" />
                    Home / Public site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={dropdownItemClass}>
                  <Link to="/profile">My profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={dropdownItemClass}>
                  <Link to="/membership">Membership</Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild className={dropdownItemClass}>
                    <Link to="/admin/dashboard" data-testid="header-admin-dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4 opacity-70" />
                      Admin dashboard
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={dropdownItemClass}
                  data-testid="header-account-logout"
                  onClick={() => void handleLogout()}
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 opacity-70" />
                    Logout
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                'shrink-0 gap-1.5 px-2 font-medium xl:hidden',
                overlayHeader ? 'text-white hover:bg-white/10 hover:text-white' : 'text-foreground/85'
              )}
            >
              <Link to="/login" data-testid="header-login-mobile">
                <Lock className="h-4 w-4" aria-hidden />
                <span>Login</span>
              </Link>
            </Button>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('shrink-0 xl:hidden', overlayHeader && 'text-white hover:bg-white/10')}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-[min(100vw,22rem)] flex-col border-l border-border/60 bg-background p-0 pt-8"
            >
              <nav
                aria-label="Mobile navigation"
                className="flex flex-1 flex-col gap-0 overflow-y-auto overscroll-contain px-1 pb-8"
              >
                {!user ? (
                  <div className="border-b border-border/50 px-3 pb-4 pt-2" data-testid="header-mobile-account-menu">
                    <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Account
                    </p>
                    <Button
                      asChild
                      variant="secondary"
                      className="h-12 w-full gap-2 text-base font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to="/login" data-testid="header-login-menu">
                        <Lock className="h-4 w-4" />
                        Login
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-b border-border/50 px-3 pb-4 pt-2 space-y-2"
                    data-testid="header-mobile-account-menu"
                  >
                    <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      My account
                    </p>
                    <Button asChild variant="outline" className="h-11 w-full justify-start gap-2" onClick={() => setMobileOpen(false)}>
                      <Link to="/">
                        <Home className="h-4 w-4" />
                        Home / Public site
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 w-full justify-start gap-2" onClick={() => setMobileOpen(false)}>
                      <Link to="/profile">
                        <UserCircle className="h-4 w-4" />
                        My profile
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 w-full justify-start gap-2" onClick={() => setMobileOpen(false)}>
                      <Link to="/membership">Membership</Link>
                    </Button>
                    {isAdmin ? (
                      <Button asChild variant="outline" className="h-11 w-full justify-start gap-2" onClick={() => setMobileOpen(false)}>
                        <Link to="/admin/dashboard" data-testid="header-admin-dashboard-mobile">
                          <LayoutDashboard className="h-4 w-4" />
                          Admin dashboard
                        </Link>
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      className="h-11 w-full justify-start gap-2"
                      data-testid="header-mobile-account-logout"
                      onClick={() => {
                        setMobileOpen(false)
                        void handleLogout()
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                )}
                <p className="px-4 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Explore
                </p>
                {PRIMARY_NAV.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'mx-2 rounded-xl px-4 py-3.5 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted/90'
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <div className="mt-4 border-t border-border/50 pt-3">
                  <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Community
                  </p>
                  {COMMUNITY_MENU.map((link) => (
                    <NavLink
                      key={link.to + link.label}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'mx-2 block rounded-xl px-4 py-3 text-[15px] font-medium leading-snug transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/90'
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                <div className="mt-4 border-t border-border/50 pt-3">
                  <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Resources
                  </p>
                  {RESOURCES_MENU.map((link) => (
                    <NavLink
                      key={link.label + link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'mx-2 block rounded-xl px-4 py-3 text-[15px] font-medium leading-snug transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/90'
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                {MORE_NAV_GROUPS.map((group) => (
                  <div key={group.heading} className="mt-4 border-t border-border/50 pt-3">
                    <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {group.heading}
                    </p>
                    {group.items.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'mx-2 block rounded-xl px-4 py-3 text-[15px] font-medium leading-snug transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground hover:bg-muted/90'
                          )
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                ))}
                <div className="mt-6 space-y-2.5 border-t border-border/60 px-3 pt-5">
                  <Button asChild className="h-12 w-full text-base font-semibold" onClick={() => setMobileOpen(false)}>
                    <Link to={JOIN_MEMBERSHIP_ITEM.to}>Join</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 w-full text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/events/submit">Submit Event</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
