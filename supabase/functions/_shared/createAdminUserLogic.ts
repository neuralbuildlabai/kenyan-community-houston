/** Pure helpers for create-admin-user (testable from Vitest). */

export type CallerAdminRow = {
  id?: string
  email?: string | null
  role?: string | null
}

/** PostgREST `.or()` filter: match auth user id or normalized email in admin_users. */
export function buildCallerAdminLookupOrFilter(callerId: string, callerEmail: string): string {
  if (!callerEmail) return `id.eq.${callerId}`
  return `id.eq.${callerId},email.eq.${callerEmail}`
}

/**
 * admin_users.role is the authority source when a row exists.
 * profiles.role is legacy fallback only when no admin_users row is found.
 */
export function resolveCallerRole(
  adminRow: CallerAdminRow | null | undefined,
  profileRole: string | null | undefined
): string {
  if (adminRow) {
    return (adminRow.role ?? '').trim()
  }
  return (profileRole ?? '').trim()
}

export function isAuthUserAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already been registered') ||
    m.includes('already registered') ||
    m.includes('user already registered') ||
    m.includes('email address has already been registered')
  )
}

export function buildAdminUsersRow(input: {
  userId: string
  email: string
  role: string
  displayName: string | null
  positionTitle: string | null
  nowIso: string
}): Record<string, unknown> {
  return {
    id: input.userId,
    email: input.email,
    role: input.role,
    display_name: input.displayName,
    position_title: input.positionTitle,
    must_change_password: true,
    temporary_password_set_at: input.nowIso,
    password_changed_at: null,
  }
}

export function buildAdminUserProfilesRow(input: {
  userId: string
  displayName: string | null
  positionTitle: string | null
  nowIso: string
}): Record<string, unknown> {
  return {
    user_id: input.userId,
    must_change_password: true,
    temporary_password_set_at: input.nowIso,
    password_changed_at: null,
    display_name: input.displayName,
    position_title: input.positionTitle,
    updated_at: input.nowIso,
  }
}

export function buildProfilesRow(input: {
  userId: string
  email: string
  role: string
  displayName: string | null
  nowIso: string
}): Record<string, unknown> {
  return {
    id: input.userId,
    email: input.email,
    full_name: input.displayName,
    role: input.role,
    force_password_change: true,
    password_changed_at: null,
    updated_at: input.nowIso,
  }
}
