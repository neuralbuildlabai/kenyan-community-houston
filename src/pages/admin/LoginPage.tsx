import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { trackLogin } from '@/lib/analytics'
import { toast } from 'sonner'
import { APP_NAME } from '@/lib/constants'
import { KighLogo } from '@/components/KighLogo'
import { StagingBanner } from '@/components/StagingBanner'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Enter email and password'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      const { data: sess } = await supabase.auth.getSession()
      await trackLogin('admin_login', sess.session?.user?.id ?? null)
      navigate('/admin/dashboard')
    }
  }

  return (
    // /admin/login is rendered OUTSIDE both PublicLayout and AdminLayout
    // (see src/App.tsx), so neither wrapper's <StagingBanner /> reaches
    // this page. We mount the banner here directly so staging/UAT/dev
    // builds visibly mark the login screen too. The banner component
    // self-hides when VITE_APP_ENV=production, so production behaviour
    // is unchanged.
    <div className="min-h-screen flex flex-col bg-muted/30">
      <StagingBanner />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <KighLogo withCard className="h-16 w-16" imgClassName="max-h-14" />
            </div>
            <h1 className="text-2xl font-bold">{APP_NAME}</h1>
            <p className="text-muted-foreground text-sm mt-1">Admin Portal · KIGH</p>
          </div>
          <div className="bg-background rounded-2xl border shadow-sm p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
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
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Looking for the member portal?{' '}
              <Link to="/login" className="text-primary font-medium underline-offset-4 hover:underline">
                Member login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
