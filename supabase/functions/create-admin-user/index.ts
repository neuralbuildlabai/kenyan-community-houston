import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { errorJson } from '../_shared/apiErrors.ts'
import {
  buildAdminUserProfilesRow,
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
  const reqId = crypto.randomUUID().slice(0, 8)
  const log = (...args: unknown[]) => console.log(`[create-admin-user ${reqId}]`, ...args)
  const logErr = (...args: unknown[]) => console.error(`[create-admin-user ${reqId}]`, ...args)

  try {
    const preflight = handleCorsPreflight(req)
    if (preflight) return preflight

    log('method', req.method, 'origin', req.headers.get('Origin'))

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
      logErr('getUser failed', userErr?.message)
      return errorJson(req, 401, 'unauthorized', 'Unauthorized', userErr?.message)
    }

    const callerId = userData.user.id
    const callerEmail = (userData.user.email ?? '').trim().toLowerCase()
    log('caller', callerId, callerEmail)

    let callerAdminRow: { id?: string; email?: string | null; role?: string | null } | null = null
    let callerRole = ''

    // Production bootstrap/admin safety:
    // This account is the approved KIGH super admin. Do not depend on the admin_users view
    // or legacy profiles table for this known account because profiles may not exist and
    // admin_users may be a view in this project.
    if (callerEmail === 'admin@kenyancommunityhouston.org') {
      callerAdminRow = { id: callerId, email: callerEmail, role: 'super_admin' }
      callerRole = 'super_admin'
    } else {
      const { data: callerAdminById, error: callerAdminByIdErr } = await adminClient
        .from('admin_users')
        .select('id, email, role')
        .eq('id', callerId)
        .maybeSingle()

      if (callerAdminByIdErr) {
        return errorJson(
          req,
          500,
          'CALLER_PERMISSION_LOOKUP_FAILED',
          'Unable to verify caller permissions.',
          callerAdminByIdErr.message
        )
      }

      callerAdminRow = callerAdminById

      if (!callerAdminRow && callerEmail) {
        const { data: callerAdminByEmail, error: callerAdminByEmailErr } = await adminClient
          .from('admin_users')
          .select('id, email, role')
          .eq('email', callerEmail)
          .maybeSingle()

        if (callerAdminByEmailErr) {
          return errorJson(
            req,
            500,
            'CALLER_PERMISSION_LOOKUP_FAILED',
            'Unable to verify caller permissions.',
            callerAdminByEmailErr.message
          )
        }

        callerAdminRow = callerAdminByEmail
      }

      callerRole = resolveCallerRole(callerAdminRow, null)
    }

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

    log('auth.createUser begin', email)
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { role: newRole },
    })

    if (createErr || !created?.user) {
      const createMessage = createErr?.message ?? 'Unknown auth error'
      log('auth.createUser failed', createMessage)
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
        logErr('findAuthUserByEmail threw', details)
        return errorJson(req, 500, 'auth_lookup_failed', 'Unable to look up existing account', details)
      }

      if (!existing) {
        logErr('user not found via listUsers despite already-registered error')
        return errorJson(
          req,
          409,
          'auth_user_exists',
          'An account with this email already exists but could not be loaded.',
          createMessage
        )
      }

      uid = existing.id
      log('reusing existing auth user', uid)
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(uid, {
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { role: newRole },
      })
      if (updateErr) {
        logErr('updateUserById failed', updateErr.message)
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
      log('auth user created', uid)
    }

    // `admin_users` is a join view (see migration 010), so it is not directly
    // upsertable. The view reflects:
    //   profiles.role         → role/email/display columns
    //   admin_user_profiles.* → security metadata + display_name + position_title
    // We therefore write to the two underlying tables and let the view follow.

    // profiles must be written before admin_user_profiles so the row exists for any
    // FK / role-guard logic that downstream code might consult.
    const profilesRow = buildProfilesRow({
      userId: uid,
      email,
      role: newRole,
      displayName,
      nowIso,
    })
    log('profiles upsert begin', { id: profilesRow.id, role: profilesRow.role })
    const { error: profilesErr } = await adminClient
      .from('profiles')
      .upsert(profilesRow, { onConflict: 'id' })

    if (profilesErr) {
      logErr('profiles upsert failed', profilesErr.message, profilesErr)
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

    const securityRow = buildAdminUserProfilesRow({
      userId: uid,
      displayName,
      positionTitle,
      nowIso,
    })

    log('admin_user_profiles upsert begin', { user_id: securityRow.user_id })
    const { error: securityErr } = await adminClient
      .from('admin_user_profiles')
      .upsert(securityRow, { onConflict: 'user_id' })

    if (securityErr) {
      logErr('admin_user_profiles upsert failed', securityErr.message, securityErr)
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

    log('done', uid)

    return jsonResponse(req, 200, {
      ok: true,
      message:
        'Admin user created. Share the temporary password securely; they must change it on first sign-in.',
      userId: uid,
      reusedExistingAuthUser: !authUserCreated,
    })
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack ?? '' : ''
    logErr('uncaught', details, stack)
    return errorJson(req, 500, 'internal_error', 'Unexpected server error', details)
  }
})
