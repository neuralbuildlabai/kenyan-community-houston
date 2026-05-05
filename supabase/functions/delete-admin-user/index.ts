import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // Read the caller role from the trusted `profiles` table only.
  // `user_metadata` is self-writable in Supabase auth, so falling back
  // to it would re-open the same privilege-escalation primitive that
  // migration 020 closed. Match `create-admin-user` exactly.
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()
  const role = ((profile?.role as string | undefined) ?? '').trim()
  if (role !== 'super_admin') {
    return json(403, { ok: false, message: 'Forbidden' })
  }

  let targetId: string
  try {
    const b = (await req.json()) as { userId?: string }
    targetId = (b.userId ?? '').trim()
  } catch {
    return json(400, { ok: false, message: 'Invalid JSON body' })
  }

  if (!targetId) {
    return json(400, { ok: false, message: 'Missing user id' })
  }

  if (targetId === callerId) {
    return json(400, { ok: false, message: 'You cannot remove your own account this way.' })
  }

  const { error: delErr } = await adminClient.auth.admin.deleteUser(targetId)
  if (delErr) {
    return json(400, { ok: false, message: 'Unable to complete request' })
  }

  return json(200, { ok: true, message: 'User removed' })
})
