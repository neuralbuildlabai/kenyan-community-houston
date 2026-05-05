import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
//
// Rules
//   - Only super_admin may assign super_admin.
//   - Only super_admin may assign platform_admin.
//   - platform_admin may assign all regular operational roles but
//     NOT super_admin and NOT platform_admin.
//   - community_admin may assign clearly lower operational roles
//     only. It cannot create super_admin / platform_admin /
//     community_admin (no peer creation), and cannot create the
//     specialised top-tier moderator/manager roles.
//   - Lower roles cannot create elevated admins.
//   - Unknown role assignment requests are denied.
//   - Unknown caller roles are denied.
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

// community_admin gets a deliberately narrower list. It cannot
// create peer community_admin accounts (no peer creation), it cannot
// create platform/super, and it cannot create the specialised
// content_manager/membership_manager/treasurer roles which are
// platform-tier governance positions.
const COMMUNITY_ADMIN_ASSIGNABLE: ReadonlyArray<AssignableRole> = [
  'media_moderator',
  'ads_manager',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
  'member',
]

/**
 * Returns the set of roles that a caller with `callerRole` is
 * permitted to assign when creating a new admin user. Returns an
 * empty array for unknown / non-elevated callers.
 *
 * Exported so the same matrix can be unit-tested and mirrored by
 * the frontend Admin Users page (see `src/lib/adminRoleMatrix.ts`).
 */
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

/**
 * Returns true iff the caller may assign `targetRole`.
 */
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

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceKey) {
    return json(500, { ok: false, message: 'Server configuration error' })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { ok: false, message: 'Unauthorized' })
  }

  const jwt = authHeader.replace('Bearer ', '').trim()
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return json(401, { ok: false, message: 'Unauthorized' })
  }

  const callerId = userData.user.id

  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('role,email')
    .eq('id', callerId)
    .maybeSingle()

  if (profErr) {
    return json(500, { ok: false, message: 'Unable to complete request' })
  }

  // The DB-side `profiles.role` column is the authoritative source
  // of truth. We intentionally do NOT fall back to user_metadata —
  // that field is self-writable and would re-open the same
  // privilege-escalation primitive that migration 020 closed.
  const callerRole = (profile?.role as string | undefined)?.trim() ?? ''
  const callerEmail = (profile?.email as string | undefined)?.trim().toLowerCase() ?? ''

  if (assignableRolesForCaller(callerRole).length === 0) {
    return json(403, { ok: false, message: 'Forbidden' })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json(400, { ok: false, message: 'Invalid JSON body' })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const temporaryPassword = body.temporaryPassword ?? ''
  const newRole = (body.role ?? '').trim()
  const displayName = (body.displayName ?? '').trim() || null
  const positionTitle = (body.positionTitle ?? '').trim() || null

  if (!email || !temporaryPassword) {
    return json(400, { ok: false, message: 'Email and temporary password are required' })
  }

  if (!newRole) {
    return json(400, { ok: false, message: 'Role is required' })
  }

  if (!(ALL_ASSIGNABLE_ROLES as ReadonlyArray<string>).includes(newRole)) {
    return json(400, { ok: false, message: 'Invalid role' })
  }

  if (!callerCanAssign(callerRole, newRole)) {
    return json(403, {
      ok: false,
      message: `Your role (${callerRole}) is not permitted to assign role "${newRole}".`,
    })
  }

  // Belt-and-braces: never allow a caller to escalate themselves
  // (or another super_admin) by reusing the same email. Email is
  // already used as the auth identity below, so an email collision
  // would be rejected by createUser, but we surface the rule
  // explicitly for clarity.
  if (callerEmail && email === callerEmail) {
    return json(422, {
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
    return json(400, {
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
    return json(500, { ok: false, message: 'Unable to complete request' })
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
    return json(500, { ok: false, message: 'Unable to complete request' })
  }

  return json(200, {
    ok: true,
    message: 'Admin user created. Share the temporary password securely; they must change it on first sign-in.',
    userId: uid,
  })
})
