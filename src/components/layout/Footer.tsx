import { Link } from 'react-router-dom'
import { MapPin, Mail, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { APP_NAME } from '@/lib/constants'

const footerLinks = {
  community: [
    { to: '/events', label: 'Events' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/sports-youth', label: 'Sports & Youth' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/community-support', label: 'Community Support' },
  ],
  directory: [
    { to: '/businesses', label: 'Business Directory' },
    { to: '/new-to-houston', label: 'New to Houston' },
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact / Join' },
  ],
  submit: [
    { to: '/submit/event', label: 'Submit an Event' },
    { to: '/submit/business', label: 'List Your Business' },
    { to: '/submit/announcement', label: 'Submit Announcement' },
    { to: '/submit/fundraiser', label: 'Submit Fundraiser' },
  ],
  legal: [
    { to: '/terms', label: 'Terms of Use' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/disclaimer', label: 'Disclaimer' },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-foreground text-white mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold">
                KCH
              </div>
              <div>
                <div className="font-bold text-white">{APP_NAME}</div>
                <div className="text-xs text-white/60">Houston, Texas</div>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              Your trusted digital hub connecting the Kenyan community in Houston and surrounding
              areas. Events, businesses, announcements, and more.
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-sm text-white/60">
              <MapPin className="h-4 w-4 shrink-0 text-kenyan-gold-400" />
              <span>Houston, Texas, USA</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-white/60">
              <Mail className="h-4 w-4 shrink-0 text-kenyan-gold-400" />
              <a href="mailto:info@kenyancommunityhouston.com" className="hover:text-white transition-colors">
                info@kenyancommunityhouston.com
              </a>
            </div>
            {/* Social */}
            <div className="mt-5 flex items-center gap-3">
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

          {/* Community */}
          <div>
            <h4 className="font-semibold text-white mb-4">Community</h4>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Directory */}
          <div>
            <h4 className="font-semibold text-white mb-4">Directory</h4>
            <ul className="space-y-2">
              {footerLinks.directory.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="font-semibold text-white mb-4 mt-6">Submit</h4>
            <ul className="space-y-2">
              {footerLinks.submit.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin shortcut */}
          <div>
            <h4 className="font-semibold text-white mb-4">Admin</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/admin/login" className="text-sm text-white/65 hover:text-white transition-colors">
                  Admin Login
                </Link>
              </li>
            </ul>
            <h4 className="font-semibold text-white mb-4 mt-6">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="mt-10 mb-6 bg-white/15" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>© {year} {APP_NAME}. All rights reserved.</p>
          <p>
            Content moderated. Accuracy not guaranteed.{' '}
            <Link to="/disclaimer" className="underline hover:text-white/80">See disclaimer.</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
