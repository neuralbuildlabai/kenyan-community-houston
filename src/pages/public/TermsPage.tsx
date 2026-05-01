import { Scale } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { APP_NAME } from '@/lib/constants'

export function TermsPage() {
  return (
    <>
      <SEOHead title="Terms of Use" />

      <div className="border-b bg-gradient-to-br from-muted/50 via-background to-primary/[0.05]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Terms of Use</h1>
              <p className="mt-3 text-muted-foreground text-base sm:text-lg leading-relaxed">
                The community ground rules for using {APP_NAME}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="prose prose-sm max-w-none text-foreground/85 space-y-6 leading-relaxed">
          <p><strong>Last updated:</strong> January 2025</p>

          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By using {APP_NAME}, you agree to these Terms of Use. If you do not agree, please do not use this platform.</p>

          <h2 className="text-xl font-semibold text-foreground">2. Content Submission</h2>
          <p>When you submit content, you represent that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The information is accurate and truthful to the best of your knowledge</li>
            <li>You have the right to submit and share this content</li>
            <li>The content does not violate any laws or third-party rights</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">3. Moderation</h2>
          <p>
            All submissions are subject to review. We reserve the right to reject, edit, or remove any content at our sole discretion. We aim to moderate content within 1–5 business days.
          </p>

          <h2 className="text-xl font-semibold text-foreground">4. Fundraiser Disclaimer</h2>
          <p>
            {APP_NAME} does not verify the legitimacy of all fundraisers. We display a disclaimer on all fundraiser pages. We strongly encourage you to independently verify before donating. {APP_NAME} is not responsible for how funds are used.
          </p>

          <h2 className="text-xl font-semibold text-foreground">5. Prohibited Content</h2>
          <p>You may not submit content that is:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>False, misleading, or fraudulent</li>
            <li>Hateful, discriminatory, or threatening</li>
            <li>Spam or commercial solicitation without approval</li>
            <li>In violation of any applicable law</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground">6. Intellectual Property</h2>
          <p>You retain ownership of content you submit. By submitting, you grant {APP_NAME} a non-exclusive license to display and share the content on this platform.</p>

          <h2 className="text-xl font-semibold text-foreground">7. Disclaimer of Warranties</h2>
          <p>This platform is provided "as is" without warranties of any kind. We do not guarantee accuracy, completeness, or fitness for a particular purpose of any content.</p>

          <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
          <p>{APP_NAME} and its operators are not liable for any damages arising from use of this platform or reliance on content posted herein.</p>

          <h2 className="text-xl font-semibold text-foreground">9. Changes to Terms</h2>
          <p>We may update these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>

          <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
          <p>Questions? Email us at <a href="mailto:info@kenyancommunityhouston.com" className="text-primary hover:underline">info@kenyancommunityhouston.com</a>.</p>
        </div>
      </div>
    </>
  )
}
