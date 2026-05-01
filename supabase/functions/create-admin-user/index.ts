import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRIVILEGED_CREATOR_ROLES = new Set(['super_admin', 'community_admin'])

const ASSIGNABLE_ROLES = new Set([
  'super_admin',
  'community_admin',
  'business_admin',
  'support_admin',
  'moderator',
  'viewer',
])

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

  const { data: profile, error: profErr } = await adminClient.from('profiles').select('role').eq('id', callerId).maybeSingle()

  if (profErr) {
    return json(500, { ok: false, message: 'Unable to complete request' })
  }

  const role = (profile?.role as string | undefined) ?? (userData.user.user_metadata?.role as string | undefined) ?? ''
  if (!PRIVILEGED_CREATOR_ROLES.has(role)) {
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
  const newRole = (body.role ?? 'community_admin').trim()
  const displayName = (body.displayName ?? '').trim() || null
  const positionTitle = (body.positionTitle ?? '').trim() || null

  if (!ASSIGNABLE_ROLES.has(newRole)) {
    return json(400, { ok: false, message: 'Invalid role' })
  }

  if (!email || !temporaryPassword) {
    return json(400, { ok: false, message: 'Email and temporary password are required' })
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
