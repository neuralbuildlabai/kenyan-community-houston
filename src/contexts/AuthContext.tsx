import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AdminUserSecurity, Profile, UserRole } from '@/lib/types'
import { getAdminPasswordGate } from '@/lib/adminPasswordGate'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  isAdmin: boolean
  adminSecurity: AdminUserSecurity | null
  adminGateLoading: boolean
  adminPasswordGate: ReturnType<typeof getAdminPasswordGate>
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

  const adminRoles: UserRole[] = [
    'super_admin',
    'community_admin',
    'business_admin',
    'support_admin',
    'moderator',
    'viewer',
  ]

  const isAdmin = profile ? adminRoles.includes(profile.role) : false
  const role = profile?.role ?? null

  const adminPasswordGate = useMemo(() => getAdminPasswordGate(adminSecurity), [adminSecurity])

  async function fetchAdminSecurity(userId: string) {
    setAdminGateLoading(true)
    const { data, error } = await supabase
      .from('admin_user_profiles')
      .select('user_id, must_change_password, temporary_password_set_at, password_changed_at, display_name, position_title')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) setAdminSecurity(null)
    else setAdminSecurity((data as AdminUserSecurity) ?? null)
    setAdminGateLoading(false)
  }

  async function refreshAdminSecurity() {
    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user?.id
    if (uid) await fetchAdminSecurity(uid)
    else setAdminSecurity(null)
  }

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (!error && data) setProfile(data as Profile)
    else setProfile(null)
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id)
      await fetchAdminSecurity(user.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
        await fetchAdminSecurity(session.user.id)
      } else {
        setAdminSecurity(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
          await fetchAdminSecurity(session.user.id)
        } else {
          setProfile(null)
          setAdminSecurity(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setAdminSecurity(null)
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
