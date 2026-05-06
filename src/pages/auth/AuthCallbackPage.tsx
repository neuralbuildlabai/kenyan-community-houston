import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { resolveAuthCallbackPath, sanitizeNextParam } from '@/lib/authRedirect'
import { Button } from '@/components/ui/button'
import { KighLogo } from '@/components/KighLogo'
import { APP_NAME } from '@/lib/constants'

/**
 * Handles Supabase OAuth and email-confirmation redirects (PKCE `?code=` or session in URL).
 * Always validates `next` before navigation.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [message, setMessage] = useState('Completing sign in…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function finalizeRedirect(userId: string, next: string | null) {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user || cancelled) return

      const { data: prof } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
      const role = prof?.role as string | undefined

      const meta = user.user_metadata as Record<string, unknown>
      const fullName =
        (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
        (typeof meta.name === 'string' && meta.name.trim()) ||
        null
      const avatarUrl =
        (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
        (typeof meta.picture === 'string' && meta.picture) ||
        null

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email ?? '',
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      const dest = resolveAuthCallbackPath(next, role, '/membership')
      if (!cancelled) {
        setMessage('')
        navigate(dest, { replace: true })
      }
    }

    void (async () => {
      const next = sanitizeNextParam(params.get('next'))
      const href = typeof window !== 'undefined' ? window.location.href : ''

      const { data: existing } = await supabase.auth.getSession()
      if (existing.session?.user) {
        await finalizeRedirect(existing.session.user.id, next)
        return
      }

      const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(href)
      if (exchangeErr) {
        const { data: after } = await supabase.auth.getSession()
        if (!after.session?.user) {
          if (!cancelled) {
            setError(exchangeErr.message || 'Could not complete sign in.')
            setMessage('')
          }
          return
        }
      }

      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr || !userData.user) {
        if (!cancelled) {
          setError(userErr?.message || 'No user session after sign in.')
          setMessage('')
        }
        return
      }

      if (!cancelled) await finalizeRedirect(userData.user.id, next)
    })()

    return () => {
      cancelled = true
    }
  }, [navigate, params])

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
        <KighLogo withCard className="h-14 w-14 mb-4" />
        <h1 className="text-lg font-semibold text-foreground mb-2">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{error}</p>
        <Button asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
