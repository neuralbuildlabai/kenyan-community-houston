import type { LucideIcon } from 'lucide-react'
import {
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

      <div className="border-b border-amber-300/20 bg-gradient-to-br from-amber-50/60 via-background to-emerald-900/[0.04] dark:from-amber-950/15">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-900/80 dark:text-amber-200/80">
              Newcomer guide
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              New to Houston?
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Starting over in a new city is easier when the basic steps are clear. This guide
              brings common Houston-area services into one place so members can find the right
              office, ask better questions, and avoid relying on rumors. Official resources first,
              community-vetted services when you're ready.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-14">
        {/* ── Official resources ───────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-900/85 dark:text-emerald-300/85">
            Step one
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground tracking-tight mb-2 sm:text-3xl">Official Houston &amp; Texas resources</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            Independent government and public-service websites — driver licensing, vehicle
            registration, schools, healthcare, transit, and emergency contacts. Confirm
            requirements directly with each office before paying any fees or making the trip.
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
        <section className="rounded-3xl bg-muted/30 p-7 sm:p-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-900/85 dark:text-emerald-300/85">
            Step two
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground tracking-tight mb-3 sm:text-3xl">Community-reviewed services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-2xl">
            Community members regularly recommend trusted realtors, lenders, insurers, tax help,
            immigration attorneys, movers, and childcare providers. Reviewed submissions help keep
            this directory accurate, respectful, and useful — and you should still verify licenses,
            fees, and references directly with any provider before engaging them.
          </p>
          <ul className="flex flex-wrap gap-2 mb-7">
            {SERVICE_CATEGORIES.map((c) => (
              <li
                key={c}
                className="rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground/85 ring-1 ring-border/50"
              >
                {c}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="font-semibold">
              <Link to="/businesses">
                <Building2 className="mr-2 h-4 w-4" />
                Business directory
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/businesses/submit">List a service</Link>
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

        <div className="rounded-3xl bg-gradient-to-r from-primary to-kenyan-green-700 px-8 py-10 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 text-center sm:text-left">
          <div className="max-w-md">
            <h2 className="text-xl font-bold leading-tight">You don&apos;t have to figure this out alone</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Reach out and we&apos;ll point you in a helpful direction.
            </p>
          </div>
          <div className="mt-5 sm:mt-0 flex flex-wrap justify-center sm:justify-end gap-3">
            <Button asChild className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0 font-semibold">
              <Link to="/contact">Contact KIGH</Link>
            </Button>
            <Button asChild variant="outline" className="bg-transparent border-white/70 text-white hover:bg-white/10">
              <Link to="/chat">Ask the community</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
