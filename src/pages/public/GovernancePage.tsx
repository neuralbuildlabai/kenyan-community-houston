import { Link } from 'react-router-dom'
import {
  FileText,
  Download,
  Scale,
  Shield,
  HeartHandshake,
  Users,
  Landmark,
  Vote,
  CalendarCheck,
  Wallet,
  ShieldCheck,
  Users2,
  Gavel,
  Lock,
  Pencil,
  HelpingHand,
  Compass,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { KighLogo } from '@/components/KighLogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KIGH_NONPROFIT_CREDIBILITY_STATEMENT } from '@/lib/constants'

const CONSTITUTION_VIEW = encodeURI('/kigh-documents/governance/KIGH Constitution and Bylaws.docx')
const CONSTITUTION_DOWNLOAD = CONSTITUTION_VIEW

const RELATED_DOCS = [
  {
    title: 'KIGH Rules and Regulations',
    href: encodeURI('/kigh-documents/governance/KIGH Rules and Regulations .docx'),
    blurb: 'Standards that keep community gatherings safe, respectful, and well-organized.',
  },
  {
    title: 'KIGH Roles and Responsibilities',
    href: encodeURI('/kigh-documents/governance/KIGH Roles and Responsibilities.docx'),
    blurb: 'How leadership, committees, and volunteers share the work of serving the community.',
  },
] as const

type SectionIcon =
  | typeof Compass
  | typeof Landmark
  | typeof Users
  | typeof Vote
  | typeof CalendarCheck
  | typeof Wallet
  | typeof Lock
  | typeof Users2
  | typeof Gavel
  | typeof Pencil
  | typeof HelpingHand
  | typeof ShieldCheck
  | typeof FileText

const SECTIONS: { id: string; title: string; Icon: SectionIcon; body: string }[] = [
  {
    id: 'overview',
    title: 'Governance overview',
    Icon: Compass,
    body:
      'KIGH is guided by its constitution, bylaws, leadership responsibilities, membership expectations, and transparent community decision-making. These documents describe how the organization operates day to day, how members are heard, and how community trust is protected over the long term.',
  },
  {
    id: 'nonprofit',
    title: 'Nonprofit identity',
    Icon: Landmark,
    body:
      `${KIGH_NONPROFIT_CREDIBILITY_STATEMENT} The organization operates for community benefit — culture, mutual support, youth and family programs, civic education, and welfare — and is not affiliated with any political party or campaign.`,
  },
  {
    id: 'membership',
    title: 'Membership and good standing',
    Icon: Users,
    body:
      'Membership is open to individuals and households who support KIGH\'s mission and agree to the constitution, bylaws, and code of conduct. Good standing reflects active participation, respectful conduct in community spaces, and — where applicable — confirmation of membership through the process described in the bylaws. Membership is about belonging and shared responsibility, not fundraising.',
  },
  {
    id: 'agm',
    title: 'AGM and quorum',
    Icon: CalendarCheck,
    body:
      'The Annual General Meeting (AGM) is held in November. Members in good standing are invited to attend, hear updates, and participate in decisions specified by the bylaws. Quorum for the AGM is 25% of members in good standing. Meeting notices, agendas, and supporting documents are shared in advance so members can come prepared.',
  },
  {
    id: 'leadership',
    title: 'Leadership and committees',
    Icon: Users2,
    body:
      'Leadership stewards the organization on behalf of the community. Committees may be formed to support events, youth and family programs, welfare, communications, finance oversight, membership, sports, newcomer support, and other community priorities. Specific officers and committee chairs are listed on the organization\'s leadership directory when published — this page does not name individuals to keep public information accurate over time.',
  },
  {
    id: 'elections',
    title: 'Elections',
    Icon: Vote,
    body:
      'Elections follow the timelines, eligibility rules, and procedures described in the bylaws. Notices are given to members in advance, nominations are collected in an orderly way, and voting is conducted so that every member in good standing has a fair opportunity to participate.',
  },
  {
    id: 'financial',
    title: 'Financial stewardship',
    Icon: Wallet,
    body:
      'Community funds are handled with care. KIGH maintains proper records, uses approved signatories for disbursements, requires appropriate approvals for major expenses, and aims to make financial summaries available to members in line with the bylaws. The goal is straightforward: money raised for the community is spent for the community, with documentation that members can trust.',
  },
  {
    id: 'coi',
    title: 'Conflict of interest',
    Icon: ShieldCheck,
    body:
      'Leaders and volunteers disclose conflicts that could affect decisions involving money, contracts, hiring, vendor selection, or reputational risk. Where appropriate, they recuse themselves from the decision so that the community\'s interest comes first. Disclosure protects both the individual and the organization.',
  },
  {
    id: 'privacy',
    title: 'Privacy and data protection',
    Icon: Lock,
    body:
      'Member information collected for membership, events, programs, or community requests is used responsibly for legitimate community purposes. Access is limited to authorized administrators. Public pages do not display sensitive member data, and members can ask for their information to be reviewed or corrected through the contact channels listed on the site.',
  },
  {
    id: 'conduct',
    title: 'Code of conduct',
    Icon: Gavel,
    body:
      'Members and participants are expected to treat one another with respect, avoid harassment or discrimination of any kind, follow the direction of event hosts and volunteers, keep children and elders safe at community spaces, and represent the community responsibly in public and online. Concerns can be raised through the leadership channels described in the bylaws.',
  },
  {
    id: 'amendments',
    title: 'Amendments and member participation',
    Icon: Pencil,
    body:
      'Members are informed of proposed amendments to the constitution and bylaws in advance, in line with the notice and voting thresholds described in the bylaws. Community input matters — proposals should reach members early enough to be discussed openly, not voted on under pressure.',
  },
  {
    id: 'documents',
    title: 'Document access',
    Icon: FileText,
    body:
      'The constitution, bylaws, and related governance documents are available below to view or download. These documents may be updated from time to time through the amendment process. If a section is unclear or you spot an inconsistency, please reach out — accuracy matters.',
  },
]

export function GovernancePage() {
  return (
    <>
      <SEOHead
        title="Constitution & Bylaws"
        description="Community standards, leadership structure, membership rules, and governance guidelines for Kenyans in Greater Houston."
      />

      <div className="border-b border-slate-900/15 bg-gradient-to-br from-slate-900/[0.07] via-background to-kenyan-gold-500/[0.06]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            <KighLogo
              withCard
              className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 shadow-sm"
              imgClassName="max-h-[5.5rem] sm:max-h-[6.25rem]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Scale className="h-3 w-3" /> Governance
                </Badge>
                <Badge variant="outline" className="gap-1 font-normal">
                  <Shield className="h-3 w-3" /> Transparency
                </Badge>
                <Badge variant="outline" className="gap-1 font-normal">
                  <Landmark className="h-3 w-3" /> 501(c)(3) nonprofit
                </Badge>
              </div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700 dark:text-slate-300">
                Official documents
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-bold text-foreground tracking-tight">
                Constitution & Bylaws
              </h1>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-3xl">
                How Kenyan Community Houston is organized, led, funded, and held accountable to its
                members. Transparent governance is what turns a group of neighbors into a trusted
                community institution.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10">
        <Card className="border-primary/20 shadow-sm overflow-hidden">
          <CardHeader className="bg-primary/[0.04] pb-4">
            <CardTitle className="text-xl">About these documents</CardTitle>
            <CardDescription className="text-base text-foreground/85 leading-relaxed">
              Kenyans in Greater Houston is guided by a constitution and bylaws that describe the
              organization's purpose, membership structure, leadership roles, elections, financial
              management, privacy standards, conflict-of-interest rules, and community conduct
              expectations. The summaries below explain each topic in plain language so members can
              understand how the organization is meant to work without reading the full document
              front to back.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground pt-6">
            <p>
              <strong className="text-foreground">Transparency.</strong> These pages are provided
              for community transparency. The full governing documents take precedence over the
              summaries shown here, and the constitution and bylaws may be updated from time to time
              through the amendment process they describe.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-normal">AGM month: November</Badge>
              <Badge variant="outline" className="font-normal">AGM quorum: 25% of members in good standing</Badge>
              <Badge variant="outline" className="font-normal">Nonpartisan community organization</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Button asChild size="lg" className="gap-2">
            <a href={CONSTITUTION_VIEW} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4" /> View full constitution & bylaws
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <a href={CONSTITUTION_DOWNLOAD} download>
              <Download className="h-4 w-4" /> Download constitution & bylaws
            </a>
          </Button>
        </div>

        <div>
          <div className="mb-5 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700/90 dark:text-slate-300/85">
              Topics at a glance
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              How the organization is run
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Each topic below summarizes part of the constitution and bylaws in plain language.
              Use these to orient yourself before reading the full document.
            </p>
          </div>
          <div className="rounded-xl border bg-card shadow-sm divide-y overflow-hidden">
            {SECTIONS.map((s) => {
              const Icon = s.Icon
              return (
                <details key={s.id} id={s.id} className="group px-4 sm:px-5 py-3 open:bg-muted/25 transition-colors">
                  <summary className="cursor-pointer list-none font-medium flex items-start justify-between gap-3 py-1.5 text-foreground">
                    <span className="flex items-start gap-3">
                      <Icon className="h-4 w-4 mt-0.5 text-primary/70 shrink-0" aria-hidden />
                      <span>{s.title}</span>
                    </span>
                    <span
                      aria-hidden
                      className="text-muted-foreground text-xs tabular-nums shrink-0 group-open:rotate-180 transition-transform duration-200 mt-1"
                    >
                      ▼
                    </span>
                  </summary>
                  <p className="text-sm text-muted-foreground leading-relaxed pb-3 pt-3 pl-7 border-t border-border/60 mt-2">
                    {s.body}
                  </p>
                </details>
              )
            })}
          </div>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.04] to-kenyan-gold-500/[0.05] shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpingHand className="h-5 w-5 text-primary shrink-0" />
              Volunteer with KIGH
            </CardTitle>
            <CardDescription className="text-base text-foreground/85 leading-relaxed">
              Most of what KIGH does is carried by volunteers — committee work, event hosts, youth
              and family programs, welfare check-ins, communications, and quiet help behind the
              scenes. If you would like to serve, the community will welcome the time you can give.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/serve">Call to Serve</Link>
            </Button>
          </CardContent>
        </Card>

        <div>
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700/90 dark:text-slate-300/85">
              Reference library
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              Related governance files
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {RELATED_DOCS.map((doc) => (
              <Card key={doc.title} className="border-border/90 shadow-sm hover:border-primary/35 hover:shadow-md transition-all">
                <CardHeader>
                  <CardTitle className="text-lg leading-snug">{doc.title}</CardTitle>
                  <CardDescription>{doc.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild variant="default" size="sm">
                    <a href={doc.href} target="_blank" rel="noopener noreferrer">View</a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={doc.href} download>Download</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="shadow-sm border-primary/15">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary shrink-0" />
              Become a member
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
              Joining KIGH means standing with neighbors across Greater Houston and agreeing to the
              standards described in the constitution, bylaws, and code of conduct.
            </p>
            <Button asChild>
              <Link to="/membership">Membership registration</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
