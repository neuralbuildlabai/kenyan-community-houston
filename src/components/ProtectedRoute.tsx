import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/types'
import { isElevatedAdminRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Optional fine-grained gate. If supplied, the user must hold one
   * of these roles in addition to passing the elevated-admin check.
   */
  requiredRoles?: readonly UserRole[]
}

/**
 * Admin route guard.
 *
 * Hardening notes (May 2026 production-readiness run):
 *  - Both authentication AND elevated role are required. A signed-in
 *    user without an elevated `profiles.role` is bounced to the admin
 *    login page rather than the admin dashboard.
 *  - The DB-side RLS now enforces the same role boundary
 *    (`public.kigh_is_elevated_admin()`), so this guard is purely a
 *    UX shortcut; the database is still the source of truth.
 */
export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Must be signed in AND hold an elevated admin role. Both `isAdmin`
  // (from AuthContext) and the role list check are intentional —
  // belt-and-braces.
  if (!user || !isAdmin || !isElevatedAdminRole(profile?.role)) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (requiredRoles && profile && !requiredRoles.includes(profile.role)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <>{children}</>
}
