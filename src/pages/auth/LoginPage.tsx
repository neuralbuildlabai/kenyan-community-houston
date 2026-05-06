import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { trackLogin } from '@/lib/analytics'
import { toast } from 'sonner'
import { APP_NAME } from '@/lib/constants'
import { KighLogo } from '@/components/KighLogo'
import { isElevatedAdminRole } from '@/lib/types'
import { resolvePostLoginPath, sanitizeNextParam } from '@/lib/authRedirect'
import { getBrowserOrigin } from '@/lib/siteOrigin'

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const nextPath = sanitizeNextParam(params.get('next'))
  const [oauthLoading, setOauthLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Enter email and password')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setLoading(false)
      toast.error(error.message)
      return
    }

    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user?.id ?? null
    if (!uid) {
      setLoading(false)
      toast.error('Session was not ready. Please try signing in again.')
      return
    }
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
    const role = (prof?.role as string | undefined) ?? undefined

    const dest = resolvePostLoginPath(nextPath, role)
    await trackLogin(isElevatedAdminRole(role) ? 'admin_login' : 'member_login', uid)
    setLoading(false)
    navigate(dest, { replace: true })
  }

  async function handleGoogle() {
    const origin = getBrowserOrigin()
    if (!origin) {
      toast.error('Cannot start Google sign in (missing page origin).')
      return
    }
    const nextForCallback = nextPath ?? '/profile'
    setOauthLoading(true)
    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextForCallback)}`,
        skipBrowserRedirect: true,
      },
    })
    setOauthLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (oauthData?.url) {
      window.location.assign(oauthData.url)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-muted/40 to-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <KighLogo withCard className="h-16 w-16" imgClassName="max-h-14" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{APP_NAME}</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
        </div>
        <div className="bg-card rounded-2xl border shadow-sm p-8 space-y-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading || oauthLoading}
            onClick={() => void handleGoogle()}
          >
            {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <form onSubmit={(ev) => void handleLogin(ev)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            New to KIGH?{' '}
            <Link to="/membership" className="text-primary font-medium underline-offset-4 hover:underline">
              Membership registration
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
