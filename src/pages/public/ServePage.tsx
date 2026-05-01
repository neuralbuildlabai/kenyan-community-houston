import { Link } from 'react-router-dom'
import { CheckCircle2, HeartHandshake, Sparkles } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { KighLogo } from '@/components/KighLogo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SERVE_OPPORTUNITY_GROUPS } from '@/lib/serveOpportunities'

const ASK_LIST = [
  'Respect for the community and its members',
  'Willingness to work with others',
  'Clear and timely communication',
  'Reliability with assigned tasks',
  'Commitment to KIGH’s constitution, bylaws, and code of conduct',
  'A heart for service',
]

export function ServePage() {
  return (
    <>
      <SEOHead
        title="A Call to Serve Our Community"
        description="KIGH invites community members to volunteer time and skills to help carry Kenyans in Greater Houston forward — in leadership, committees, events, and outreach."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.08] via-background to-kenyan-gold-500/[0.06]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <div className="flex justify-center mb-6">
            <KighLogo withCard className="h-20 w-20 sm:h-24 sm:w-24 shadow-md" imgClassName="max-h-16 sm:max-h-[4.25rem]" />
          </div>
          <Badge variant="secondary" className="mb-4 gap-1.5 font-normal">
            <HeartHandshake className="h-3.5 w-3.5 text-primary" />
            Community invitation
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold text-foreground tracking-tight leading-tight">
            A Call to Serve Our Community
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            KIGH is inviting community members to give their time, skills, and heart to help strengthen Kenyans in Greater Houston.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="font-semibold shadow-md">
              <Link to="/serve/apply">I Want to Serve</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/membership">Become a Member</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-12 sm:space-y-14">
        <section className="space-y-5 text-muted-foreground leading-relaxed text-base">
          <p>
            KIGH is built by people who care enough to serve. As the community grows, we need more hands to support leadership, events, youth programs, welfare efforts, communications, membership, and outreach.
          </p>
          <p>
            These are voluntary roles, but they matter. Every gathering, announcement, resource, fundraiser, and community support effort depends on people stepping forward where they can — in small and large ways — to help carry the community forward.
          </p>
          <p className="text-sm sm:text-base rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-3.5 text-foreground/90 leading-relaxed">
            <Sparkles className="inline h-4 w-4 text-kenyan-gold-600 mr-1.5 align-text-bottom" />
            You do not need a board title to make a difference. Some people can lead a committee, others can help with one event, make calls, welcome newcomers, support youth activities, or help behind the scenes. What matters most is willingness, consistency, and care for the community.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-1.5">Where your help can make a difference</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            You can serve in a leadership role, support a committee, help with one event, or contribute behind the scenes. Many hands keep the community strong — serve where you can.
          </p>
          <div className="space-y-10">
            {SERVE_OPPORTUNITY_GROUPS.map((group) => (
              <div key={group.heading}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary/90 mb-4">{group.heading}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.items.map(({ title, hint }) => (
                    <Card key={title} className="border-border/90 shadow-sm hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex gap-3">
                          <div className="mt-0.5 shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-primary/80" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-sm sm:text-base leading-snug">{title}</h4>
                            {hint ? <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{hint}</p> : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">What we ask from volunteers</h2>
          <ul className="space-y-3 text-muted-foreground max-w-2xl">
            {ASK_LIST.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kenyan-gold-500" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-muted/30 via-background to-primary/[0.04] p-8 sm:p-10 text-center shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Ready to raise your hand?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6 leading-relaxed">
            Share a few details so KIGH can follow up thoughtfully. There is no pressure — only an open door for those who wish to serve.
          </p>
          <Button asChild size="lg" className="font-semibold shadow-md">
            <Link to="/serve/apply">I Want to Serve</Link>
          </Button>
        </section>
      </div>
    </>
  )
}
