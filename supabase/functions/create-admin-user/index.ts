import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

// ────────────────────────────────────────────────────────────────────
// Server-side admin role assignment matrix.
//
// Production-readiness audit (May 2026) found that the previous
// implementation used a single flat ASSIGNABLE_ROLES set without
// looking at the caller's role, which let community_admin assign
// super_admin. The matrix below is the authoritative server-side
// enforcement and is the single source of truth used by both the
// Edge Function and the frontend UsersPage role picker (via the
// exported `assignableRolesForCaller` helper).
// ────────────────────────────────────────────────────────────────────

export const ALL_ASSIGNABLE_ROLES = [
  'super_admin',
  'platform_admin',
  'community_admin',
  'content_manager',
  'membership_manager',
  'treasurer',
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
] as const

export type AssignableRole = (typeof ALL_ASSIGNABLE_ROLES)[number]

const SUPER_ADMIN_ASSIGNABLE: ReadonlyArray<AssignableRole> = [
  'super_admin',
  'platform_admin',
  'community_admin',
  'content_manager',
  'membership_manager',
  'treasurer',
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
]

const PLATFORM_ADMIN_ASSIGNABLE: ReadonlyArray<AssignableRole> = [
  'community_admin',
  'content_manager',
  'membership_manager',
  'treasurer',
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
]

const COMMUNITY_ADMIN_ASSIGNABLE: ReadonlyArray<AssignableRole> = [
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
]

export function assignableRolesForCaller(callerRole: string | null | undefined): ReadonlyArray<AssignableRole> {
  switch ((callerRole ?? '').trim()) {
    case 'super_admin':
      return SUPER_ADMIN_ASSIGNABLE
    case 'platform_admin':
      return PLATFORM_ADMIN_ASSIGNABLE
    case 'community_admin':
      return COMMUNITY_ADMIN_ASSIGNABLE
    default:
      return []
  }
}

export function callerCanAssign(callerRole: string | null | undefined, targetRole: string): boolean {
  const allowed = assignableRolesForCaller(callerRole)
  return (allowed as ReadonlyArray<string>).includes(targetRole)
}

type Body = {
  email?: string
  temporaryPassword?: string
  role?: string
  displayName?: string
  positionTitle?: string
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { ok: false, message: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(req, 500, { ok: false, message: 'Server configuration error' })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse(req, 401, { ok: false, message: 'Unauthorized' })
  }

  const jwt = authHeader.replace('Bearer ', '').trim()
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return jsonResponse(req, 401, { ok: false, message: 'Unauthorized' })
  }

  const callerId = userData.user.id

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('role,email')
    .eq('id', callerId)
    .maybeSingle()

  if (profErr) {
    return jsonResponse(req, 500, { ok: false, message: 'Unable to complete request' })
  }

  const callerRole = (profile?.role as string | undefined)?.trim() ?? ''
  const callerEmail = (profile?.email as string | undefined)?.trim().toLowerCase() ?? ''

  if (assignableRolesForCaller(callerRole).length === 0) {
    return jsonResponse(req, 403, { ok: false, message: 'Forbidden' })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonResponse(req, 400, { ok: false, message: 'Invalid JSON body' })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const temporaryPassword = body.temporaryPassword ?? ''
  const newRole = (body.role ?? '').trim()
  const displayName = (body.displayName ?? '').trim() || null
  const positionTitle = (body.positionTitle ?? '').trim() || null

  if (!email || !temporaryPassword) {
    return jsonResponse(req, 400, { ok: false, message: 'Email and temporary password are required' })
  }

  if (!newRole) {
    return jsonResponse(req, 400, { ok: false, message: 'Role is required' })
  }

  if (!(ALL_ASSIGNABLE_ROLES as ReadonlyArray<string>).includes(newRole)) {
    return jsonResponse(req, 400, { ok: false, message: 'Invalid role' })
  }

  if (!callerCanAssign(callerRole, newRole)) {
    return jsonResponse(req, 403, {
      ok: false,
      message: `Your role (${callerRole}) is not permitted to assign role "${newRole}".`,
    })
  }

  if (callerEmail && email === callerEmail) {
    return jsonResponse(req, 422, {
      ok: false,
      message: 'You cannot use this endpoint to modify your own account.',
    })
  }

  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { role: newRole },
  })

  if (createErr || !created?.user) {
    return jsonResponse(req, 400, {
      ok: false,
      message: 'Unable to create account. Check the email address and try again.',
    })
  }

  const uid = created.user.id

  const { error: upProf } = await adminClient.from('profiles').upsert(
    {
      id: uid,
      email,
      full_name: displayName,
      role: newRole,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (upProf) {
    await adminClient.auth.admin.deleteUser(uid)
    return jsonResponse(req, 500, { ok: false, message: 'Unable to complete request' })
  }

  const { error: secErr } = await adminClient.from('admin_user_profiles').upsert(
    {
      user_id: uid,
      must_change_password: true,
      temporary_password_set_at: new Date().toISOString(),
      password_changed_at: null,
      display_name: displayName,
      position_title: positionTitle,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (secErr) {
    await adminClient.auth.admin.deleteUser(uid)
    return jsonResponse(req, 500, { ok: false, message: 'Unable to complete request' })
  }

  return jsonResponse(req, 200, {
    ok: true,
    message: 'Admin user created. Share the temporary password securely; they must change it on first sign-in.',
    userId: uid,
  })
})
