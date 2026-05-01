import { Link } from 'react-router-dom'
import { CheckCircle2, HeartHandshake, Sparkles } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { KighLogo } from '@/components/KighLogo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SERVE_OPPORTUNITY_CARDS } from '@/lib/serveOpportunities'

const ASK_LIST = [
  'Respect for the community and its members',
  'Willingness to work with others',
  'Good communication',
  'Reliability with assigned tasks',
  'Commitment to KIGH’s constitution, bylaws, and code of conduct',
  'A heart for service',
]

export function ServePage() {
  return (
    <>
      <SEOHead
        title="A Call to Serve Our Community"
        description="KIGH invites community members to volunteer time and skills for leadership, committees, events, youth programs, welfare support, communications, and outreach."
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
            KIGH is looking for community members willing to give their time, skills, and heart to help strengthen Kenyans in Greater Houston.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="font-semibold shadow-md">
              <Link to="/serve/apply">I Want to Serve</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/membership">Membership</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-14">
        <section className="space-y-5 text-muted-foreground leading-relaxed text-base">
          <p>
            Kenyans in Greater Houston is built by people who care enough to serve. As the community grows, we need volunteers to help with{' '}
            <strong className="text-foreground font-medium">leadership, administration, events, youth programs, welfare support, communications, finance support, membership,</strong>{' '}
            and <strong className="text-foreground font-medium">community outreach</strong>.
          </p>
          <p>
            These are voluntary roles, but they are meaningful. Every event, announcement, resource, fundraiser, youth activity, and community support effort depends on people stepping forward and helping in the area where they can contribute.
          </p>
          <p className="text-sm sm:text-base rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-3 text-foreground/90">
            <Sparkles className="inline h-4 w-4 text-kenyan-gold-600 mr-1.5 align-text-bottom" />
            You do <strong className="text-foreground">not</strong> need a board title to make a difference. Some serve in visible roles; others support quietly behind the scenes. What matters is showing up where you can, with consistency and care.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-2">Where help is needed</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            Explore the areas below. Choose one path or several — many hands keep the community strong, in both small and large ways.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVE_OPPORTUNITY_CARDS.map(({ title, hint }) => (
              <Card key={title} className="border-border/90 shadow-sm hover:border-primary/30 transition-colors">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-primary/80" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug">{title}</h3>
                      {hint ? <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{hint}</p> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-gradient-to-br from-muted/40 to-background p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">You can serve even if you only have a little time</h2>
          <p className="text-muted-foreground leading-relaxed">
            You do not need to have a title to help. Some people can lead a committee, some can support one event, some can help with calls, records, youth activities, setup, cleanup, outreach, fundraising, or sharing information. What matters most is willingness, consistency, and love for the community.
          </p>
        </section>

        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">What we ask from volunteers</h2>
          <ul className="space-y-3 text-muted-foreground">
            {ASK_LIST.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kenyan-gold-500" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-gradient-to-r from-primary to-kenyan-green-800 p-8 sm:p-10 text-white text-center shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to raise your hand?</h2>
          <p className="text-white/85 max-w-lg mx-auto mb-6 leading-relaxed">
            Share a few details so we can follow up thoughtfully. There is no pressure — only an open door for those who wish to serve.
          </p>
          <Button asChild size="lg" className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0 font-semibold shadow-md">
            <Link to="/serve/apply">I Want to Serve</Link>
          </Button>
        </section>
      </div>
    </>
  )
}
