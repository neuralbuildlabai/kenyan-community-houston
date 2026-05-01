import { ShieldCheck } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { APP_NAME } from '@/lib/constants'

export function PrivacyPage() {
  return (
    <>
      <SEOHead title="Privacy Policy" />

      <div className="border-b bg-gradient-to-br from-muted/50 via-background to-primary/[0.05]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Privacy Policy</h1>
              <p className="mt-3 text-muted-foreground text-base sm:text-lg leading-relaxed">
                How {APP_NAME} collects, uses, and protects the information you share with us.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="prose prose-sm max-w-none text-foreground/85 space-y-6 leading-relaxed">
          <p><strong>Last updated:</strong> January 2025</p>

          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p>
            When you submit content (events, announcements, business listings, fundraisers, or contact forms) to {APP_NAME}, we collect the information you voluntarily provide, including your name, email address, phone number, and any content you submit.
          </p>

          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Review and moderate content submissions</li>
            <li>Publish approved community content</li>
            <li>Respond to your inquiries</li>
            <li>Improve our platform</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">3. Information Sharing</h2>
          <p>
            We do not sell your personal information. We may display your name as content attribution when you submit posts with a byline. Contact information is kept private and not publicly displayed.
          </p>

          <h2 className="text-xl font-semibold text-foreground">4. Data Storage</h2>
          <p>
            Your data is stored securely using Supabase (hosted on AWS). We implement reasonable security measures to protect your information.
          </p>

          <h2 className="text-xl font-semibold text-foreground">5. Cookies</h2>
          <p>
            We use minimal cookies for session management and authentication. We do not use tracking or advertising cookies.
          </p>

          <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
          <p>
            You may request deletion or correction of your personal data by contacting us. We will respond within 30 days.
          </p>

          <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
          <p>For privacy inquiries, contact us at <a href="mailto:info@kenyancommunityhouston.com" className="text-primary hover:underline">info@kenyancommunityhouston.com</a>.</p>
        </div>
      </div>
    </>
  )
}
