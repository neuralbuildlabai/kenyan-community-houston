import type { LucideIcon } from 'lucide-react'
import {
  MapPin,
  Phone,
  BookOpen,
  Heart,
  Briefcase,
  GraduationCap,
  Home,
  Car,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  Building2,
  Landmark,
  Bus,
  Stethoscope,
  Scale,
  AlertTriangle,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary font-medium text-sm underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </a>
  )
}

const OFFICIAL_RESOURCE_GROUPS: {
  title: string
  Icon: LucideIcon
  links: { label: string; href: string }[]
  note?: string
}[] = [
  {
    title: 'Driver license & ID',
    Icon: ShieldCheck,
    links: [{ label: 'Texas DPS — driver license & ID', href: 'https://www.dps.texas.gov/section/driver-license' }],
  },
  {
    title: 'Vehicle registration',
    Icon: Car,
    links: [
      { label: 'Texas DMV — vehicle registration', href: 'https://www.txdmv.gov/motorists/register-your-vehicle' },
      {
        label: 'Harris County Tax Assessor-Collector (vehicle / property)',
        href: 'https://www.hctax.net/Auto',
      },
    ],
  },
  {
    title: 'City & county services',
    Icon: Landmark,
    links: [
      { label: 'City of Houston', href: 'https://www.houstontx.gov/' },
      { label: 'Harris County, Texas', href: 'https://www.harriscountytx.gov/' },
    ],
  },
  {
    title: 'Transportation',
    Icon: Bus,
    links: [{ label: 'METRO Houston (routes, fares, trip tools)', href: 'https://www.ridemetro.org/' }],
  },
  {
    title: 'Schools',
    Icon: GraduationCap,
    links: [
      { label: 'Texas Education Agency — parents & students', href: 'https://tea.texas.gov/parents-students' },
      { label: 'Houston ISD — enrollment & family resources', href: 'https://www.houstonisd.org/enrollment' },
    ],
    note: 'School zoning and eligibility depend on your address. Always confirm attendance boundaries and enrollment rules with the district before you move or sign a lease.',
  },
  {
    title: 'Healthcare',
    Icon: Stethoscope,
    links: [
      { label: 'Harris Health System', href: 'https://www.harrishealth.org/' },
      { label: 'HealthCare.gov — marketplace coverage', href: 'https://www.healthcare.gov/' },
    ],
    note: 'Compare plans, networks, and costs directly with providers and insurers.',
  },
  {
    title: 'Legal & immigration',
    Icon: Scale,
    links: [
      { label: 'USCIS', href: 'https://www.uscis.gov/' },
      { label: 'Lone Star Legal Aid (nonprofit civil legal help)', href: 'https://www.lonestarlegal.org/' },
      { label: 'Houston Volunteer Lawyers', href: 'https://www.makejusticereal.org/' },
    ],
    note: 'Use a licensed attorney for immigration legal advice. Do not pay unlicensed "notarios" or unaccredited consultants for legal services — they are not authorized to practice law.',
  },
  {
    title: 'Emergency & non-emergency',
    Icon: Phone,
    links: [
      { label: '211 Texas — information & referrals (incl. social services)', href: 'https://www.211texas.org/' },
      { label: 'Harris County social services hub', href: 'https://www.harriscountytx.gov/Services' },
    ],
    note: 'Emergencies: call 911. Houston police non-emergency: 713-884-3131. METRO customer service: 713-635-4000.',
  },
]

const SERVICE_CATEGORIES = [
  'Realtors & Housing',
  'Mortgage / Lending',
  'Insurance',
  'Tax & Financial Help',
  'Immigration / Legal',
  'Moving & Shipping',
  'Childcare / Schools',
  'Faith & Community Groups',
] as const

type AccordionSection = {
  Icon: LucideIcon
  title: string
  content: string | ReactNode
}

const sections: AccordionSection[] = [
  {
    Icon: Home,
    title: 'Finding a Place to Live',
    content:
      'Houston has many neighborhoods welcoming to the Kenyan community. Popular areas include Sugar Land, Katy, Missouri City, and Pearland. Listings on Zillow, Apartments.com, and HAR.com can help you compare options. Consider commute, school zoning (verify with the district), and budget before you commit.',
  },
  {
    Icon: Car,
    title: 'Transportation & Driving',
    content:
      'Houston is spread out; most households rely on a car. Use the official Texas DPS and METRO links above for licensing and transit. Rideshare apps are widely available in urban corridors.',
  },
  {
    Icon: GraduationCap,
    title: 'Schools & Education',
    content:
      'The region includes districts such as Houston ISD, Katy ISD, Fort Bend ISD, and Cy-Fair ISD. For higher education, explore the University of Houston, Rice University, Texas Southern University, and others. Always confirm enrollment and zoning with the district that serves your address.',
  },
  {
    Icon: Briefcase,
    title: 'Employment & Careers',
    content:
      'Major sectors include energy, healthcare, aerospace, and technology. The Texas Workforce Commission (twc.texas.gov), LinkedIn, and local job fairs are useful starting points. Community networks can help with referrals once you are settled.',
  },
  {
    Icon: ShieldCheck,
    title: 'Healthcare & Insurance',
    content:
      'The region has strong hospital networks. Harris Health and community clinics serve many uninsured and underinsured residents. Use the official links above for coverage basics, then confirm networks and costs with each plan or employer.',
  },
  {
    Icon: BookOpen,
    title: 'Legal & Immigration',
    content:
      'Start with USCIS for federal immigration forms and notices. For legal advice, work with a licensed attorney or accredited nonprofit legal services — see the official links above. Avoid unlicensed "notarios" offering immigration legal work.',
  },
  {
    Icon: Heart,
    title: 'Community & Faith',
    content: (
      <>
        Find churches, benevolence groups, welfare groups, and community institutions in the{' '}
        <Link to="/community-groups" className="text-primary font-medium underline-offset-4 hover:underline">
          Community Groups & Institutions
        </Link>{' '}
        directory. Attend KIGH events, introduce yourself, and ask how others found housing, schools, and support when they arrived.
      </>
    ),
  },
  {
    Icon: Phone,
    title: 'Important phone numbers',
    content:
      '911 — life-threatening emergencies.\n713-884-3131 — Houston police non-emergency.\n713-635-4000 — METRO customer service.\n211 — Texas information & referral (social services, utilities help, and more).\nSee also the Official Houston & Texas resources section above for direct web links.',
  },
]

function AccordionItem({ section }: { section: AccordionSection }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border rounded-xl overflow-hidden bg-card/50">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <section.Icon className="h-5 w-5 text-primary" />
        </div>
        <span className="flex-1 font-semibold text-base">{section.title}</span>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed border-t">
          <div className="pt-4">
            {typeof section.content === 'string' ? (
              <div className="whitespace-pre-line">{section.content}</div>
            ) : (
              <div className="whitespace-normal">{section.content}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function NewToHoustonPage() {
  return (
    <>
      <SEOHead
        title="New to Houston"
        description="Official Houston and Texas resources, community-reviewed service listings, and practical guidance for Kenyans settling in Greater Houston."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.07] via-background to-kenyan-gold-500/[0.06]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary mb-5 shadow-sm">
            <MapPin className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">New to Houston?</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base sm:text-lg leading-relaxed">
            Welcome to Houston. Use official resources with confidence, explore community-reviewed listings when you are ready, and connect with others who have walked the same path.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-14">
        {/* ── Official resources ───────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">Official Houston & Texas resources</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            These are independent government and public-service sites. Open each in a new tab, read official guidance, and confirm requirements before you visit an office or pay fees.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {OFFICIAL_RESOURCE_GROUPS.map((group) => (
              <Card key={group.title} className="border-border/80 shadow-sm hover:border-primary/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <group.Icon className="h-4 w-4 shrink-0" />
                    <CardTitle className="text-base font-semibold leading-snug">{group.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <ul className="space-y-2">
                    {group.links.map((l) => (
                      <li key={l.href}>
                        <OutLink href={l.href}>{l.label}</OutLink>
                      </li>
                    ))}
                  </ul>
                  {group.note ? <CardDescription className="text-xs leading-relaxed pt-1">{group.note}</CardDescription> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Community-reviewed services ─────────────────────────── */}
        <section className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] via-background to-muted/30 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-foreground tracking-tight mb-3">Community-reviewed services</h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 max-w-2xl">
            Some newcomers need help finding housing, insurance, tax help, legal support, moving services, childcare, or other practical services. KIGH can help organize community-submitted listings so families can compare options and contact providers directly.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5 max-w-2xl border-l-2 border-kenyan-gold-500/60 pl-3">
            Over time, listings may include verified or featured profiles and community-support placements. Today, submissions are reviewed before publication; always verify credentials, references, and terms yourself.
          </p>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Categories we organize around</p>
          <ul className="flex flex-wrap gap-2 mb-6">
            {SERVICE_CATEGORIES.map((c) => (
              <li
                key={c}
                className="rounded-full border border-border/80 bg-background/90 px-3 py-1 text-xs font-medium text-foreground/90"
              >
                {c}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Button asChild className="font-semibold w-full sm:w-auto">
              <Link to="/businesses/submit">List Your Service</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/businesses" className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Browse Business Directory
              </Link>
            </Button>
          </div>
        </section>

        {/* ── Disclaimer ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-3 sm:px-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Disclaimer:</span> Listings and external links are provided for community information only. KIGH does not guarantee, endorse, or take responsibility for services offered by third-party providers. Please verify credentials, fees, licenses, and terms directly before engaging any provider.
          </p>
        </div>

        {/* ── Topic accordions ─────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Practical topics</h2>
          <div className="space-y-3">
            {sections.map((section) => (
              <AccordionItem key={section.title} section={section} />
            ))}
          </div>
        </section>

        <div className="rounded-2xl bg-gradient-to-r from-primary to-kenyan-green-700 p-8 text-white text-center">
          <h2 className="text-xl font-bold mb-2">Connect with the community</h2>
          <p className="text-white/85 mb-5 max-w-md mx-auto text-sm leading-relaxed">
            You do not have to figure everything out alone. Reach out through KIGH and we will do our best to point you in a helpful direction.
          </p>
          <Button asChild className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0 font-semibold">
            <Link to="/contact">Contact KIGH</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
