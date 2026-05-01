import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AdminUserSecurity, Profile, UserRole } from '@/lib/types'
import { getSessionAdminPasswordGate } from '@/lib/adminPasswordGate'

const ADMIN_ROLES: UserRole[] = [
  'super_admin',
  'community_admin',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
]

const ADMIN_SECURITY_FETCH_MS = 12_000

function profileIsAdmin(profile: Profile | null): boolean {
  return !!profile && ADMIN_ROLES.includes(profile.role)
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  isAdmin: boolean
  adminSecurity: AdminUserSecurity | null
  adminGateLoading: boolean
  adminPasswordGate: ReturnType<typeof getSessionAdminPasswordGate>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshAdminSecurity: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminSecurity, setAdminSecurity] = useState<AdminUserSecurity | null>(null)
  const [adminGateLoading, setAdminGateLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const isAdmin = profileIsAdmin(profile)
  const role = profile?.role ?? null

  const adminPasswordGate = useMemo(
    () => getSessionAdminPasswordGate(isAdmin, adminSecurity),
    [isAdmin, adminSecurity]
  )

  async function fetchAdminSecurity(userId: string) {
    setAdminGateLoading(true)
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      console.warn('[auth] admin_user_profiles query timed out; failing closed until retry')
      setAdminSecurity(null)
    }, ADMIN_SECURITY_FETCH_MS)

    try {
      const { data, error } = await supabase
        .from('admin_user_profiles')
        .select(
          'user_id, must_change_password, temporary_password_set_at, password_changed_at, display_name, position_title'
        )
        .eq('user_id', userId)
        .maybeSingle()

      window.clearTimeout(timer)
      if (settled) return

      settled = true
      if (error) {
        console.warn('[auth] admin_user_profiles query failed:', error.message)
        setAdminSecurity(null)
        return
      }
      setAdminSecurity((data as AdminUserSecurity) ?? null)
    } catch (e) {
      window.clearTimeout(timer)
      if (!settled) {
        settled = true
        console.warn('[auth] fetchAdminSecurity error:', e)
        setAdminSecurity(null)
      }
    } finally {
      window.clearTimeout(timer)
      setAdminGateLoading(false)
    }
  }

  async function refreshAdminSecurity() {
    try {
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess.session?.user?.id
      if (!uid) {
        setAdminSecurity(null)
        setAdminGateLoading(false)
        return
      }
      await fetchAdminSecurity(uid)
    } catch (e) {
      console.warn('[auth] refreshAdminSecurity error:', e)
      setAdminSecurity(null)
      setAdminGateLoading(false)
    }
  }

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (!error && data) {
      const p = data as Profile
      setProfile(p)
      return p
    }
    setProfile(null)
    return null
  }

  async function refreshProfile() {
    if (!user) return
    try {
      const prof = await fetchProfile(user.id)
      if (profileIsAdmin(prof)) {
        await fetchAdminSecurity(user.id)
      } else {
        setAdminSecurity(null)
        setAdminGateLoading(false)
      }
    } catch (e) {
      console.warn('[auth] refreshProfile error:', e)
      setAdminSecurity(null)
      setAdminGateLoading(false)
    }
  }

  async function applySession(next: Session | null) {
    setSession(next)
    setUser(next?.user ?? null)
    try {
      if (!next?.user) {
        setProfile(null)
        setAdminSecurity(null)
        setAdminGateLoading(false)
        return
      }
      const prof = await fetchProfile(next.user.id)
      if (profileIsAdmin(prof)) {
        await fetchAdminSecurity(next.user.id)
      } else {
        setAdminSecurity(null)
        setAdminGateLoading(false)
      }
    } catch (e) {
      console.warn('[auth] applySession error:', e)
      setProfile(null)
      setAdminSecurity(null)
      setAdminGateLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { data: { session: initial } } = await supabase.auth.getSession()
        if (cancelled) return
        await applySession(initial)
      } catch (e) {
        console.warn('[auth] initial getSession bootstrap error:', e)
        setProfile(null)
        setAdminSecurity(null)
        setAdminGateLoading(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setAdminSecurity(null)
    setAdminGateLoading(false)
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        isAdmin,
        adminSecurity,
        adminGateLoading,
        adminPasswordGate,
        signIn,
        signOut,
        refreshProfile,
        refreshAdminSecurity,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
