import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SEOHead } from '@/components/SEOHead'
import { KighLogo } from '@/components/KighLogo'
import { APP_NAME } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { getBrowserOrigin } from '@/lib/siteOrigin'

/**
 * Self-serve password reset — step 1 of 2.
 *
 * User enters their email; Supabase emails a one-time recovery link via
 * the configured SMTP (Resend, set up post-launch). The link lands them
 * on /change-password with a temporary recovery session, where they set
 * a new password.
 *
 * We intentionally do NOT differentiate "no such account" vs "email
 * sent" in the UI — Supabase already returns success in both cases
 * (account-enumeration mitigation), and we mirror that with a single
 * confirmation message.
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      toast.error('Enter your email address.')
      return
    }
    const origin = getBrowserOrigin()
    if (!origin) {
      toast.error('Cannot start password reset (missing page origin).')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${origin}/change-password`,
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  return (
    <>
      <SEOHead title="Reset password" description={`Reset your ${APP_NAME} account password.`} />
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <KighLogo className="h-10 w-10" />
            <div>
              <h1 className="text-lg font-semibold">Reset your password</h1>
              <p className="text-sm text-muted-foreground">
                We&apos;ll email you a link to choose a new one.
              </p>
            </div>
          </div>

          {sent ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <div className="flex items-start gap-3">
                <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div className="space-y-1">
                  <p className="font-semibold">Check your inbox.</p>
                  <p>
                    If an account exists for <strong>{email.trim()}</strong>, you&apos;ll
                    receive a password reset link in the next minute or two. The link expires
                    in one hour.
                  </p>
                  <p className="text-xs text-green-900/80">
                    Didn&apos;t receive it? Check spam, or try again with a different email.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fp-email">Email address</Label>
                <Input
                  id="fp-email"
                  data-testid="forgot-password-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
                data-testid="forgot-password-submit"
              >
                <KeyRound className="mr-2 h-4 w-4" aria-hidden />
                {submitting ? 'Sending reset link…' : 'Send reset link'}
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to sign in
          </Link>
        </div>
      </div>
    </>
  )
}
