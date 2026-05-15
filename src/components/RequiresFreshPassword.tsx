import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { requiresProfilePasswordRefresh } from '@/lib/profilePasswordGate'

export function RequiresFreshPassword({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user && profile && requiresProfilePasswordRefresh(profile, user)) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/change-password?next=${next}`} replace />
  }

  return <>{children}</>
}
