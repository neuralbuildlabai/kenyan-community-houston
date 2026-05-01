import { Link } from 'react-router-dom'
import { MapPin, Mail, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { APP_NAME } from '@/lib/constants'
import { KighLogo } from '@/components/KighLogo'

const community = [
  { to: '/events', label: 'Events' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/sports-youth', label: 'Sports & Youth' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/community-support', label: 'Community Support' },
]

const directoryResources = [
  { to: '/businesses', label: 'Business Directory' },
  { to: '/community-groups', label: 'Community Groups' },
  { to: '/serve', label: 'Call to Serve' },
  { to: '/membership', label: 'Membership' },
  { to: '/support', label: 'Support KIGH' },
  { to: '/resources', label: 'Resources' },
  { to: '/governance', label: 'Governance' },
  { to: '/new-to-houston', label: 'New to Houston' },
]

const submitAdminLegal = [
  { to: '/events/submit', label: 'Submit an Event' },
  { to: '/community-groups/submit', label: 'Submit Community Group' },
  { to: '/businesses/submit', label: 'List Your Business' },
  { to: '/announcements/submit', label: 'Submit Announcement' },
  { to: '/community-support/submit', label: 'Submit Fundraiser' },
  { to: '/admin/login', label: 'Admin Login' },
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
            className="text-sm text-white/70 hover:text-white transition-colors leading-snug"
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
    <footer className="bg-foreground text-white mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <KighLogo withCard className="h-11 w-11 shrink-0 border-white/20 bg-white" imgClassName="max-h-9" />
              <div>
                <div className="font-bold text-white leading-tight">{APP_NAME}</div>
                <div className="text-xs text-white/55 mt-0.5">Kenyans in Greater Houston</div>
              </div>
            </div>
            <p className="text-sm text-white/65 leading-relaxed max-w-sm mb-6">
              Your trusted hub for events, businesses, resources, and community connection in Greater Houston.
            </p>
            <div className="space-y-2 text-sm text-white/60">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-kenyan-gold-400 mt-0.5" />
                <span>Houston, Texas, USA</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 shrink-0 text-kenyan-gold-400 mt-0.5" />
                <a href="mailto:info@kenyancommunityhouston.com" className="hover:text-white transition-colors">
                  info@kenyancommunityhouston.com
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-kenyan-gold-400/90 mb-4">Submit · admin · legal</h4>
            <LinkList items={submitAdminLegal} />
          </div>
        </div>

        <Separator className="mt-14 mb-6 bg-white/12" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/45">
          <p>© {year} {APP_NAME}. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Content moderated.{' '}
            <Link to="/disclaimer" className="underline hover:text-white/70">Disclaimer</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
