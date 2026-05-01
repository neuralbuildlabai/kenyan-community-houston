import { Link } from 'react-router-dom'
import { FileText, Download, Scale, Shield, HeartHandshake } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { KighLogo } from '@/components/KighLogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const CONSTITUTION_VIEW = encodeURI('/kigh-documents/governance/KIGH Constitution and Bylaws.docx')
const CONSTITUTION_DOWNLOAD = CONSTITUTION_VIEW

const RELATED_DOCS = [
  {
    title: 'KIGH Rules and Regulations',
    href: encodeURI('/kigh-documents/governance/KIGH Rules and Regulations .docx'),
    blurb: 'Community rules and standards.',
  },
  {
    title: 'KIGH Roles and Responsibilities',
    href: encodeURI('/kigh-documents/governance/KIGH Roles and Responsibilities.docx'),
    blurb: 'Leadership roles and expectations.',
  },
] as const

const SECTIONS: { id: string; title: string; body: string }[] = [
  {
    id: 'purpose',
    title: 'Purpose & Mission',
    body:
      'KIGH exists to unite, serve, and celebrate Kenyans across Greater Houston through cultural connection, mutual support, civic engagement, and programs that strengthen families and youth.',
  },
  {
    id: 'membership',
    title: 'Membership',
    body:
      'Membership is open to individuals and households who support KIGH’s mission and agree to the constitution, bylaws, and code of conduct. Good standing includes timely dues and respectful participation in community spaces.',
  },
  {
    id: 'conduct',
    title: 'Code of Conduct',
    body:
      'Members and participants are expected to treat one another with dignity, avoid harassment or discrimination, respect event hosts and volunteers, and represent the community positively in public settings and online.',
  },
  {
    id: 'leadership',
    title: 'Leadership & Committees',
    body:
      'Leadership is structured to balance transparency with practical decision-making. Committees may focus on events, youth, welfare, communications, finance oversight, and other priorities defined by the board and membership.',
  },
  {
    id: 'elections',
    title: 'Elections',
    body:
      'Elections follow timelines and eligibility rules described in the bylaws, with fair notice to members and orderly nomination and voting procedures.',
  },
  {
    id: 'meetings',
    title: 'Meetings & AGM',
    body:
      'Regular meetings keep the community informed and engaged. The Annual General Meeting (AGM) is held in November. Quorum for the AGM is 25% of members in good standing, as defined in the bylaws.',
  },
  {
    id: 'financial',
    title: 'Financial Management',
    body:
      'Treasury practices emphasize accountability, approved signatories, documented approvals for major expenses, and alignment with the organization’s nonprofit community mission.',
  },
  {
    id: 'privacy',
    title: 'Privacy & Data Protection',
    body:
      'Personal information collected for membership, events, or programs is used for legitimate community purposes, safeguarded against unnecessary disclosure, and handled in line with applicable privacy expectations.',
  },
  {
    id: 'coi',
    title: 'Conflict of Interest',
    body:
      'Leaders and volunteers disclose conflicts that could affect decisions involving money, contracts, or reputational risk, and recuse themselves when appropriate.',
  },
  {
    id: 'disputes',
    title: 'Dispute Resolution',
    body:
      'Disputes should first seek good-faith resolution through designated leaders or mediation channels described in the bylaws before escalation.',
  },
  {
    id: 'amendments',
    title: 'Amendments & Dissolution',
    body:
      'Amendments follow the voting thresholds and notice periods in the bylaws. Any dissolution process would prioritize lawful distribution of assets consistent with the organization’s purpose.',
  },
  {
    id: 'nonpolitical',
    title: 'Non-Political and Non-Lobbying Clause',
    body:
      'KIGH is a community organization focused on culture, mutual aid, and civic education at a non-partisan community level. It does not endorse candidates for office or conduct lobbying as defined by law.',
  },
]

export function GovernancePage() {
  return (
    <>
      <SEOHead
        title="Constitution & Bylaws"
        description="Community standards, leadership structure, membership rules, and governance guidelines for Kenyans in Greater Houston."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.07] via-background to-muted/50">
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
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-bold text-foreground tracking-tight">
                Constitution & Bylaws
              </h1>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-3xl">
                Community standards, leadership structure, membership rules, and governance guidelines for Kenyans in Greater Houston.
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
              Kenyans in Greater Houston is guided by a constitution and bylaws that outline the organization’s purpose, membership structure, leadership roles, elections, financial management, privacy standards, conflict-of-interest rules, and community conduct expectations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground pt-6">
            <p>
              <strong className="text-foreground">Transparency:</strong> This document is provided for community transparency. It may be updated from time to time in accordance with the amendment process described in the bylaws.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-normal">AGM month: November</Badge>
              <Badge variant="outline" className="font-normal">AGM quorum: 25% of members in good standing</Badge>
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
          <h2 className="text-xl font-semibold text-foreground mb-4">Topics at a glance</h2>
          <div className="rounded-xl border bg-card shadow-sm divide-y overflow-hidden">
            {SECTIONS.map((s) => (
              <details key={s.id} className="group px-4 sm:px-5 py-3 open:bg-muted/25 transition-colors">
                <summary className="cursor-pointer list-none font-medium flex items-center justify-between gap-3 py-1.5 text-foreground">
                  <span>{s.title}</span>
                  <span className="text-muted-foreground text-xs tabular-nums shrink-0 group-open:rotate-180 transition-transform duration-200">▼</span>
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed pb-2 pt-3 border-t border-border/60 mt-2">
                  {s.body}
                </p>
              </details>
            ))}
          </div>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.04] to-kenyan-gold-500/[0.05] shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary shrink-0" />
              Volunteer with KIGH
            </CardTitle>
            <CardDescription className="text-base text-foreground/85 leading-relaxed">
              Leadership and committee work is voluntary and community-led. If you are interested in helping KIGH serve the community, let us know.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/serve">Call to Serve</Link>
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Related governance files</h2>
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

        <Card className="shadow-sm">
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground max-w-lg">
              Ready to join? Register as a member and agree to these standards on the membership form.
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
