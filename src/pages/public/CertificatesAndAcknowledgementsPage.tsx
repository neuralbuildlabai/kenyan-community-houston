import { Link } from 'react-router-dom'
import { Award, HeartHandshake, Mic2, Sparkles, Users } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { KighLogo } from '@/components/KighLogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CERTIFICATE_TEMPLATES } from '@/lib/certificateTemplates'

const CATEGORY_ICONS = {
  'volunteer-appreciation': HeartHandshake,
  'community-speaker': Mic2,
  'community-service-leadership': Users,
  'donor-sponsor': Sparkles,
  'youth-achievement': Award,
  'vendor-partner': Users,
} as const

export function CertificatesAndAcknowledgementsPage() {
  return (
    <>
      <SEOHead
        title="Certificates & Acknowledgements"
        description="Learn how Kenyans in Greater Houston Community recognizes volunteers, speakers, donors, youth leaders, vendors, and partners through official certificates of appreciation."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.08] via-background to-kenyan-gold-500/[0.06]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <div className="flex justify-center mb-6">
            <KighLogo withCard className="h-20 w-20 sm:h-24 sm:w-24 shadow-md" imgClassName="max-h-16 sm:max-h-[4.25rem]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Certificates & Acknowledgements
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            KIGH honors the people and partners who strengthen our community through service, leadership,
            generosity, and participation. Official certificates are issued by KIGH leadership for public
            recognition at events and community gatherings.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14 space-y-12">
        <section className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Kenyans in Greater Houston Community presents formal certificates to recognize individuals and
            organizations whose contributions reflect our shared values of service, unity, and excellence.
            Certificates are designed for framing and community award presentations.
          </p>
          <p className="text-sm rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-3.5 text-foreground/90">
            Certificate creation is reserved for KIGH administrators. If you believe someone deserves
            recognition, please contact KIGH leadership or mention it when you{' '}
            <Link to="/contact" className="link-editorial">
              reach out to the community
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6">Recognition categories</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {CERTIFICATE_TEMPLATES.map((template) => {
              const Icon = CATEGORY_ICONS[template.id as keyof typeof CATEGORY_ICONS] ?? Award
              return (
                <Card key={template.id} className="border-border/90 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{template.category}</h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {template.title} — {template.bodyText.split('\n\n')[0]}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-kenyan-green-800/20 bg-kenyan-green-50/40 px-6 py-8 text-center">
          <h2 className="text-xl font-bold text-foreground">Serving the community</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Interested in volunteering or stepping into a leadership role? KIGH welcomes members who want to
            help carry the community forward.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/serve">A Call to Serve</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contact KIGH</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
