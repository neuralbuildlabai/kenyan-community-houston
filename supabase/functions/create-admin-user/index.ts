import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { errorJson } from '../_shared/apiErrors.ts'
import {
  buildAdminUserProfilesRow,
  buildAdminUsersRow,
  buildCallerAdminLookupOrFilter,
  buildProfilesRow,
  isAuthUserAlreadyRegistered,
  resolveCallerRole,
} from '../_shared/createAdminUserLogic.ts'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

// ────────────────────────────────────────────────────────────────────
// Server-side admin role assignment matrix.
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

export async function findAuthUserByEmail(
  adminClient: SupabaseClient,
  email: string
): Promise<{ id: string; email: string | undefined } | null> {
  const normalized = email.trim().toLowerCase()
  let page = 1
  const perPage = 200

  while (page <= 50) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => (u.email ?? '').trim().toLowerCase() === normalized)
    if (match) return { id: match.id, email: match.email }
    if (data.users.length < perPage) return null
    page += 1
  }

  return null
}

Deno.serve(async (req) => {
  try {
    const preflight = handleCorsPreflight(req)
    if (preflight) return preflight

    if (req.method !== 'POST') {
      return errorJson(req, 405, 'method_not_allowed', 'Method not allowed')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl) {
      return errorJson(
        req,
        500,
        'config_missing',
        'Server configuration error',
        'SUPABASE_URL is not set'
      )
    }
    if (!serviceKey) {
      return errorJson(
        req,
        500,
        'config_missing',
        'Server configuration error',
        'SUPABASE_SERVICE_ROLE_KEY is not set'
      )
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return errorJson(req, 401, 'unauthorized', 'Unauthorized')
    }

    const jwt = authHeader.replace('Bearer ', '').trim()
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return errorJson(req, 401, 'unauthorized', 'Unauthorized', userErr?.message)
    }

    const callerId = userData.user.id
    const callerEmail = (userData.user.email ?? '').trim().toLowerCase()

    const { data: callerAdminRow, error: callerAdminErr } = await adminClient
      .from('admin_users')
      .select('id, email, role')
      .or(buildCallerAdminLookupOrFilter(callerId, callerEmail))
      .limit(1)
      .maybeSingle()

    if (callerAdminErr) {
      return errorJson(
        req,
        500,
        'CALLER_PERMISSION_LOOKUP_FAILED',
        'Unable to verify caller permissions.',
        callerAdminErr.message
      )
    }

    let profileRole: string | null = null
    if (!callerAdminRow) {
      const { data: profileRow, error: profileErr } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', callerId)
        .maybeSingle()

      if (profileErr) {
        return errorJson(
          req,
          500,
          'CALLER_PERMISSION_LOOKUP_FAILED',
          'Unable to verify caller permissions.',
          profileErr.message
        )
      }
      profileRole = (profileRow?.role as string | undefined) ?? null
    }

    const callerRole = resolveCallerRole(callerAdminRow, profileRole)

    if (!callerAdminRow && !callerRole) {
      return errorJson(
        req,
        403,
        'CALLER_NOT_ADMIN',
        'Your account is not authorized to create admin users.'
      )
    }

    if (assignableRolesForCaller(callerRole).length === 0) {
      return errorJson(
        req,
        403,
        'CALLER_NOT_ADMIN',
        'Your account is not authorized to create admin users.'
      )
    }

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return errorJson(req, 400, 'invalid_json', 'Invalid JSON body')
    }

    const email = (body.email ?? '').trim().toLowerCase()
    const temporaryPassword = body.temporaryPassword ?? ''
    const newRole = (body.role ?? '').trim()
    const displayName = (body.displayName ?? '').trim() || null
    const positionTitle = (body.positionTitle ?? '').trim() || null

    if (!email || !temporaryPassword) {
      return errorJson(req, 400, 'validation_error', 'Email and temporary password are required')
    }

    if (!newRole) {
      return errorJson(req, 400, 'validation_error', 'Role is required')
    }

    if (!(ALL_ASSIGNABLE_ROLES as ReadonlyArray<string>).includes(newRole)) {
      return errorJson(req, 400, 'invalid_role', 'Invalid role')
    }

    if (!callerCanAssign(callerRole, newRole)) {
      return errorJson(
        req,
        403,
        'role_not_assignable',
        `Your role (${callerRole}) is not permitted to assign role "${newRole}".`
      )
    }

    if (callerEmail && email === callerEmail) {
      return errorJson(
        req,
        422,
        'self_modification_forbidden',
        'You cannot use this endpoint to modify your own account.'
      )
    }

    const nowIso = new Date().toISOString()
    let uid: string
    let authUserCreated = false

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { role: newRole },
    })

    if (createErr || !created?.user) {
      const createMessage = createErr?.message ?? 'Unknown auth error'
      if (!isAuthUserAlreadyRegistered(createMessage)) {
        return errorJson(
          req,
          400,
          'auth_create_failed',
          'Unable to create account. Check the email address and try again.',
          createMessage
        )
      }

      let existing: { id: string; email: string | undefined } | null = null
      try {
        existing = await findAuthUserByEmail(adminClient, email)
      } catch (lookupErr) {
        const details = lookupErr instanceof Error ? lookupErr.message : String(lookupErr)
        return errorJson(req, 500, 'auth_lookup_failed', 'Unable to look up existing account', details)
      }

      if (!existing) {
        return errorJson(
          req,
          409,
          'auth_user_exists',
          'An account with this email already exists but could not be loaded.',
          createMessage
        )
      }

      uid = existing.id
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(uid, {
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { role: newRole },
      })
      if (updateErr) {
        return errorJson(
          req,
          400,
          'auth_update_failed',
          'Unable to update existing account credentials.',
          updateErr.message
        )
      }
    } else {
      uid = created.user.id
      authUserCreated = true
    }

    const adminUsersRow = buildAdminUsersRow({
      userId: uid,
      email,
      role: newRole,
      displayName,
      positionTitle,
      nowIso,
    })

    const { error: adminUsersErr } = await adminClient
      .from('admin_users')
      .upsert(adminUsersRow, { onConflict: 'id' })

    if (adminUsersErr) {
      if (authUserCreated) {
        await adminClient.auth.admin.deleteUser(uid)
      }
      return errorJson(
        req,
        500,
        'admin_users_upsert_failed',
        'Unable to save admin user record',
        adminUsersErr.message
      )
    }

    const securityRow = buildAdminUserProfilesRow({
      userId: uid,
      displayName,
      positionTitle,
      nowIso,
    })

    const { error: securityErr } = await adminClient
      .from('admin_user_profiles')
      .upsert(securityRow, { onConflict: 'user_id' })

    if (securityErr) {
      if (authUserCreated) {
        await adminClient.auth.admin.deleteUser(uid)
      }
      return errorJson(
        req,
        500,
        'admin_user_profiles_upsert_failed',
        'Unable to save admin security profile',
        securityErr.message
      )
    }

    const { error: profilesErr } = await adminClient
      .from('profiles')
      .upsert(
        buildProfilesRow({
          userId: uid,
          email,
          role: newRole,
          displayName,
          nowIso,
        }),
        { onConflict: 'id' }
      )

    if (profilesErr) {
      if (authUserCreated) {
        await adminClient.auth.admin.deleteUser(uid)
      }
      return errorJson(
        req,
        500,
        'profiles_upsert_failed',
        'Unable to save login profile (profiles)',
        profilesErr.message
      )
    }

    return jsonResponse(req, 200, {
      ok: true,
      message:
        'Admin user created. Share the temporary password securely; they must change it on first sign-in.',
      userId: uid,
      reusedExistingAuthUser: !authUserCreated,
    })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    return errorJson(req, 500, 'internal_error', 'Unexpected server error', details)
  }
})
