import { Link } from 'react-router-dom'
import { MapPin, Mail, Facebook, Twitter, Instagram, Youtube, Lock } from 'lucide-react'
import { APP_NAME, KIGH_NONPROFIT_CREDIBILITY_STATEMENT, PUBLIC_CONTACT_EMAIL } from '@/lib/constants'
import { KighLogo } from '@/components/KighLogo'

/**
 * Live social links. Only entries with a real URL render in the footer — placeholder
 * `#` href values are deliberately omitted so the public footer never shows links
 * that lead nowhere. Replace `href` with a real profile URL to enable an icon.
 */
const SOCIAL_LINKS: { Icon: typeof Facebook; label: string; href: string | null }[] = [
  { Icon: Facebook, label: 'Facebook', href: null },
  { Icon: Twitter, label: 'Twitter', href: null },
  { Icon: Instagram, label: 'Instagram', href: null },
  { Icon: Youtube, label: 'YouTube', href: null },
]

const explore = [
  { to: '/events', label: 'Events' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/businesses', label: 'Business Directory' },
]

const community = [
  { to: '/chat', label: 'Community Chat' },
  { to: '/community-groups', label: 'Community Groups' },
  { to: '/community-feed', label: 'Community Feed' },
  { to: '/new-to-houston', label: 'New to Houston' },
  { to: '/membership', label: 'Membership' },
]

const resources = [
  { to: '/resources', label: 'Resources' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/community-support', label: 'Community Support' },
  { to: '/serve', label: 'Call to Serve' },
  { to: '/governance', label: 'Governance' },
]

const organization = [
  { to: '/about', label: 'About KIGH' },
  { to: '/contact', label: 'Contact' },
  { to: '/support', label: 'Support KIGH' },
  { to: '/sports-youth', label: 'Sports & Youth' },
]

const contribute = [
  { to: '/events/submit', label: 'Submit an event' },
  { to: '/announcements/submit', label: 'Submit an announcement' },
  { to: '/businesses/submit', label: 'List your business' },
  { to: '/community-support/submit', label: 'Submit a fundraiser' },
  { to: '/community-groups/submit', label: 'Submit a community group' },
]

const legal = [
  { to: '/terms', label: 'Terms' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/disclaimer', label: 'Disclaimer' },
]

function LinkColumn({
  title,
  items,
}: {
  title: string
  items: { to: string; label: string }[]
}) {
  return (
    <div>
      <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-kenyan-gold-400/95">
        {title}
      </h4>
      <ul className="space-y-3">
        {items.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-[15px] leading-snug text-white/75 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-16 border-t border-white/5 bg-footer text-white sm:mt-20">
      <div
        className="h-1 w-full bg-gradient-to-r from-primary via-kenyan-gold-500 to-primary opacity-80"
        aria-hidden
      />
      <div className="public-container py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-12 border-b border-white/10 pb-14 lg:grid-cols-12 lg:gap-10 lg:pb-16">
          <div className="lg:col-span-4">
            <div className="mb-6 flex items-center gap-3.5">
              <KighLogo
                withCard
                className="h-12 w-12 shrink-0 border-white/25 bg-white shadow-sm"
                imgClassName="max-h-10"
              />
              <div>
                <div className="text-lg font-semibold leading-tight tracking-tight">{APP_NAME}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-white/55">
                  Kenyans in Greater Houston
                </div>
              </div>
            </div>
            <p className="max-w-md text-[15px] leading-relaxed text-white/75">
              A warm, official hub for events, businesses, resources, and neighbor-to-neighbor connection across Greater
              Houston.
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/60">{KIGH_NONPROFIT_CREDIBILITY_STATEMENT}</p>
            <div className="mt-8 space-y-3 text-sm text-white/65">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-kenyan-gold-400" aria-hidden />
                <span>Houston, Texas, USA</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-kenyan-gold-400" aria-hidden />
                <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="transition-colors hover:text-white">
                  {PUBLIC_CONTACT_EMAIL}
                </a>
              </div>
            </div>
            {SOCIAL_LINKS.some((s) => s.href) ? (
              <div className="mt-8 flex flex-wrap gap-2.5">
                {SOCIAL_LINKS.filter((s) => s.href).map(({ Icon, label, href }) => (
                  <a
                    key={label}
                    href={href as string}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:border-kenyan-gold-400/50 hover:bg-white/10"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-4">
            <LinkColumn title="Explore" items={explore} />
            <LinkColumn title="Community" items={community} />
            <LinkColumn title="Resources" items={resources} />
            <LinkColumn title="Organization" items={organization} />
            <div className="col-span-2 sm:col-span-3 lg:col-span-4">
              <LinkColumn title="Contribute" items={contribute} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-8 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {APP_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {legal.map((l) => (
              <Link key={l.to} to={l.to} className="transition-colors hover:text-white hover:underline underline-offset-4">
                {l.label}
              </Link>
            ))}
            <span aria-hidden className="text-white/20">
              ·
            </span>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white hover:underline underline-offset-4"
            >
              <Lock className="h-3 w-3" aria-hidden />
              Login
            </Link>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-white/40">Content moderated by community volunteers.</p>
      </div>
    </footer>
  )
}
