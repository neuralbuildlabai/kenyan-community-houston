import { MapPin, Phone, BookOpen, Heart, Briefcase, GraduationCap, Home, Car, ShieldCheck, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const sections = [
  {
    Icon: Home,
    title: 'Finding a Place to Live',
    content: 'Houston has many neighborhoods welcoming to the Kenyan community. Popular areas include Sugarland, Katy, Missouri City, and Pearland. Websites like Zillow, Apartments.com, and HAR.com list rentals and homes. Consider your commute, school district, and budget when choosing.',
  },
  {
    Icon: Car,
    title: 'Transportation & Driving',
    content: 'Houston is a car-dependent city. You will need a driver\'s license — visit TxDMV.gov to start the process. You can convert a foreign license to a Texas license. METRO buses and light rail are available but limited. Uber and Lyft are widely used.',
  },
  {
    Icon: GraduationCap,
    title: 'Schools & Education',
    content: 'Houston ISD and surrounding districts like Katy ISD, Fort Bend ISD, and Cy-Fair ISD are well-regarded. For higher education, Houston hosts the University of Houston, Rice University, and Texas Southern University among others.',
  },
  {
    Icon: Briefcase,
    title: 'Employment & Careers',
    content: 'Houston\'s major industries include energy/oil & gas, healthcare, aerospace, and technology. Key resources: Texas Workforce Commission (twc.texas.gov), LinkedIn, and local job fairs. Professional networks like the Kenyan Community Association can also help.',
  },
  {
    Icon: ShieldCheck,
    title: 'Healthcare & Insurance',
    content: 'Texas has many excellent hospitals. Harris Health System provides services to uninsured residents. If employed, check your employer\'s insurance plan. Medicaid and CHIP are available for qualifying families. Community health clinics offer affordable care.',
  },
  {
    Icon: BookOpen,
    title: 'Legal & Immigration',
    content: 'If you need immigration assistance, contact USCIS (uscis.gov) or a licensed immigration attorney. Houston has several nonprofit legal aid organizations. Do not pay unlicensed "notarios" for immigration help — they are not authorized lawyers.',
  },
  {
    Icon: Heart,
    title: 'Community & Faith',
    content: 'Houston has active Kenyan community organizations, churches, and mosques. The Kenyan Community Houston group is a great starting point. Join WhatsApp groups, attend events, and connect with others who have gone through the same journey.',
  },
  {
    Icon: Phone,
    title: 'Important Phone Numbers',
    content: 'Emergency: 911\nNon-emergency police: 713-884-3131\nHarris County social services: 211\nTexas Workforce Commission: 1-800-939-6631\nHouston METRO transit: 713-635-4000',
  },
]

function AccordionItem({ section }: { section: typeof sections[0] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <section.Icon className="h-5 w-5 text-primary" />
        </div>
        <span className="flex-1 font-semibold text-base">{section.title}</span>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t">
          <div className="pt-4">{section.content}</div>
        </div>
      )}
    </div>
  )
}

export function NewToHoustonPage() {
  return (
    <>
      <SEOHead title="New to Houston" description="A newcomer's guide to settling in Houston for Kenyans — housing, transportation, schools, employment, and more." />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-12">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">New to Houston?</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Welcome to Houston! This guide is here to help you navigate life in the city with confidence.
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((section) => (
            <AccordionItem key={section.title} section={section} />
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-gradient-to-r from-primary to-kenyan-green-700 p-8 text-white text-center">
          <h2 className="text-xl font-bold mb-2">Connect with the Community</h2>
          <p className="text-white/80 mb-5">Don't go through the journey alone. Reach out and we'll do our best to help.</p>
          <Button asChild className="bg-kenyan-gold-500 hover:bg-kenyan-gold-600 text-white border-0">
            <Link to="/contact">Say Hello</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
