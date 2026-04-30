import { Link } from 'react-router-dom'
import { Users, Target, Heart, Shield } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/constants'

const values = [
  { Icon: Users, title: 'Community First', description: 'We exist to serve the Kenyan community in Houston — connecting people, sharing information, and building bonds.' },
  { Icon: Target, title: 'Accuracy & Trust', description: 'Content is moderated before publishing. We strive to share accurate, helpful, and verified information.' },
  { Icon: Heart, title: 'Inclusivity', description: 'All Kenyans — and friends of the community — are welcome, regardless of tribe, background, or status.' },
  { Icon: Shield, title: 'Safety & Moderation', description: 'We review all submitted content. No open posting without moderation. Fundraiser disclaimers are always shown.' },
]

export function AboutPage() {
  return (
    <>
      <SEOHead title="About Us" description={`Learn about ${APP_NAME} — our mission, values, and how we serve the Kenyan community in Houston.`} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-14">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white font-bold text-xl mb-5">
            KCH
          </div>
          <h1 className="text-4xl font-bold mb-4">{APP_NAME}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A trusted digital hub connecting the Kenyan community in Houston and surrounding areas of Texas.
          </p>
        </div>

        <div className="prose prose-lg max-w-none text-foreground/80 mb-14">
          <p>
            We are a community-run platform built to serve Kenyans living in Houston, Texas, and the Greater Houston area. Our goal is simple: make it easier for community members to find events, stay informed, discover local Kenyan-owned businesses, and support one another.
          </p>
          <p>
            Whether you're a longtime resident or just arrived in Houston, this platform is your starting point for community connection. We post upcoming events, announcements, sports updates, and much more — all moderated to ensure quality and accuracy.
          </p>
          <p>
            We are not a government entity and do not represent any official body. We are a grassroots effort by community members for community members.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-14">
          {values.map(({ Icon, title, description }) => (
            <div key={title} className="rounded-xl border p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center rounded-2xl bg-muted/50 p-10">
          <h2 className="text-2xl font-bold mb-3">Get Involved</h2>
          <p className="text-muted-foreground mb-6">Have an event to share? A business to list? Or simply want to connect?</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild><Link to="/contact">Contact Us</Link></Button>
            <Button asChild variant="outline"><Link to="/submit/event">Submit an Event</Link></Button>
          </div>
        </div>
      </div>
    </>
  )
}
