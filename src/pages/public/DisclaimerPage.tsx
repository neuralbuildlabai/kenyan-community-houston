import { Link } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { APP_NAME } from '@/lib/constants'

export function DisclaimerPage() {
  return (
    <>
      <SEOHead
        title="Disclaimer"
        description={`Disclaimer for ${APP_NAME} — content moderation, fundraisers, third-party links, and limits of liability.`}
      />

      {/* Soft intro band — consistent with other legal/public pages */}
      <div className="border-b bg-gradient-to-br from-muted/50 via-background to-primary/[0.05]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <ScrollText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Disclaimer</h1>
              <p className="mt-3 text-muted-foreground text-base sm:text-lg leading-relaxed">
                Important information about content, fundraisers, third-party links, and the limits of what {APP_NAME} can verify.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="prose prose-sm max-w-none text-foreground/85 space-y-6 leading-relaxed">
          <p><strong>Last updated:</strong> January 2025</p>

          <h2 className="text-xl font-semibold text-foreground">1. General Information</h2>
          <p>
            The information published on {APP_NAME} is provided for general community informational purposes only.
            While we make reasonable efforts to keep content accurate and up to date, {APP_NAME} makes no
            warranties, express or implied, regarding the completeness, accuracy, reliability, or suitability of any
            information, event listing, business profile, fundraiser, announcement, or resource shown on this site.
          </p>

          <h2 className="text-xl font-semibold text-foreground">2. Community Submissions</h2>
          <p>
            Many listings on this site — including events, announcements, business directory entries, community
            groups, and fundraisers — are submitted by community members and reviewed before publication. Moderation
            reduces obvious issues but does not constitute endorsement or verification of every detail.
          </p>

          <h2 className="text-xl font-semibold text-foreground">3. Fundraiser Disclaimer</h2>
          <p>
            {APP_NAME} does not independently verify the legitimacy, financial accounting, or intended use of funds for
            every fundraiser featured on this site. Fundraisers are shared as a community service. Donors are strongly
            encouraged to independently confirm details with the organizer before contributing. {APP_NAME} is not
            responsible for how any donated funds are collected, managed, or used.
          </p>

          <h2 className="text-xl font-semibold text-foreground">4. Business Directory</h2>
          <p>
            Inclusion in the KIGH business directory is not an endorsement, recommendation, or guarantee of quality,
            licensing, pricing, or service. Members of the community should perform their own due diligence before
            entering into agreements with any business listed.
          </p>

          <h2 className="text-xl font-semibold text-foreground">5. Third-Party Links</h2>
          <p>
            This site may include links to third-party websites, payment platforms, social channels, or external
            documents. {APP_NAME} does not control and is not responsible for the content, policies, or practices of
            these external sites.
          </p>

          <h2 className="text-xl font-semibold text-foreground">6. No Professional Advice</h2>
          <p>
            Resources, articles, and "New to Houston" guidance shared on this site are general community information
            and are not legal, immigration, medical, tax, or financial advice. For matters that affect your rights,
            health, or finances, please consult a qualified professional.
          </p>

          <h2 className="text-xl font-semibold text-foreground">7. Governance Documents</h2>
          <p>
            The KIGH Constitution, Bylaws, Rules and Regulations, and Roles and Responsibilities documents available
            on this site are provided for community reference. The official, authoritative versions are those formally
            adopted by KIGH leadership and membership. If a discrepancy exists, the formally adopted version prevails.
          </p>

          <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, {APP_NAME}, its volunteers, leadership, and contributors are not
            liable for any loss or damage arising from use of, or reliance on, content published on this site.
          </p>

          <h2 className="text-xl font-semibold text-foreground">9. Changes to This Disclaimer</h2>
          <p>
            This disclaimer may be updated from time to time without prior notice. Continued use of the site after
            changes are posted constitutes acceptance of the updated disclaimer.
          </p>

          <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
          <p>
            For questions about this disclaimer, please email{' '}
            <a href="mailto:info@kenyancommunityhouston.com" className="text-primary hover:underline">
              info@kenyancommunityhouston.com
            </a>
            . You can also review our{' '}
            <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link> and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </>
  )
}
