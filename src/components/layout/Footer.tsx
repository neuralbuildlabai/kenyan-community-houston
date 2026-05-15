import { Link } from 'react-router-dom'
import { MapPin, Mail, Facebook, Twitter, Instagram, Youtube, Lock } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { APP_NAME, PUBLIC_CONTACT_EMAIL } from '@/lib/constants'
import { KighLogo } from '@/components/KighLogo'

// Top-level community destinations.
const community = [
  { to: '/events', label: 'Events' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/community-support', label: 'Community Support' },
  { to: '/sports-youth', label: 'Sports & Youth' },
  { to: '/gallery', label: 'Gallery' },
]

// Directory + member resources.
const directoryResources = [
  { to: '/businesses', label: 'Business Directory' },
  { to: '/community-groups', label: 'Community Groups' },
  { to: '/membership', label: 'Membership' },
  { to: '/chat', label: 'Ask the Community' },
  { to: '/serve', label: 'Call to Serve' },
  { to: '/support', label: 'Support KIGH' },
  { to: '/resources', label: 'Resources' },
  { to: '/governance', label: 'Governance' },
  { to: '/new-to-houston', label: 'New to Houston' },
]

// Public contribution forms — collapsed into a single tidier column.
const contribute = [
  { to: '/events/submit', label: 'Submit an event' },
  { to: '/announcements/submit', label: 'Submit an announcement' },
  { to: '/businesses/submit', label: 'List your business' },
  { to: '/community-support/submit', label: 'Submit a fundraiser' },
  { to: '/community-groups/submit', label: 'Submit a community group' },
  { to: '/contact', label: 'Contact us' },
]

// Legal / policy links.
const legal = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/disclaimer', label: 'Disclaimer' },
]

function LinkList({ items }: { items: { to: string; label: string }[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            className="text-sm text-white/72 hover:text-white/95 transition-colors leading-snug"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative bg-foreground text-white mt-14 sm:mt-16">
      {/* Top accent stripe */}
      <div
        className="h-1 w-full bg-gradient-to-r from-primary via-kenyan-gold-500 to-primary opacity-70"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-11 sm:py-14">
        <div className="grid grid-cols-1 gap-9 sm:gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <KighLogo withCard className="h-11 w-11 shrink-0 border-white/20 bg-white" imgClassName="max-h-9" />
              <div>
                <div className="font-bold text-white leading-tight">{APP_NAME}</div>
                <div className="text-xs text-white/55 mt-0.5">Kenyans in Greater Houston</div>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm mb-6">
              Your trusted hub for events, businesses, resources, and community connection across Greater Houston.
            </p>
            <div className="space-y-2 text-sm text-white/60">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-kenyan-gold-400 mt-0.5" />
                <span>Houston, Texas, USA</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 shrink-0 text-kenyan-gold-400 mt-0.5" />
                <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="hover:text-white transition-colors">
                  {PUBLIC_CONTACT_EMAIL}
                </a>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2.5">
              {[
                { Icon: Facebook, label: 'Facebook', href: '#' },
                { Icon: Twitter, label: 'Twitter', href: '#' },
                { Icon: Instagram, label: 'Instagram', href: '#' },
                { Icon: Youtube, label: 'YouTube', href: '#' },
              ].map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-primary transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kenyan-gold-400/90 mb-4">Community</h4>
            <LinkList items={community} />
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kenyan-gold-400/90 mb-4">Directory & resources</h4>
            <LinkList items={directoryResources} />
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kenyan-gold-400/90 mb-4">Contribute</h4>
            <LinkList items={contribute} />
          </div>
        </div>

        <Separator className="mt-12 mb-6 bg-white/12" />

        {/* Bottom bar: copyright + legal + shared sign-in link */}
        <div className="flex flex-col gap-3 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/55">© {year} {APP_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {legal.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="hover:text-white hover:underline underline-offset-2 transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <span aria-hidden className="text-white/25">·</span>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 hover:text-white hover:underline underline-offset-2 transition-colors"
            >
              <Lock className="h-3 w-3" aria-hidden />
              Login
            </Link>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-white/45">
          Content moderated by community volunteers.
        </p>
      </div>
    </footer>
  )
}
