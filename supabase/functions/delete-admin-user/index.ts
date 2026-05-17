import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'

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

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()
  const role = ((profile?.role as string | undefined) ?? '').trim()
  if (role !== 'super_admin') {
    return jsonResponse(req, 403, { ok: false, message: 'Forbidden' })
  }

  let targetId: string
  try {
    const b = (await req.json()) as { userId?: string }
    targetId = (b.userId ?? '').trim()
  } catch {
    return jsonResponse(req, 400, { ok: false, message: 'Invalid JSON body' })
  }

  if (!targetId) {
    return jsonResponse(req, 400, { ok: false, message: 'Missing user id' })
  }

  if (targetId === callerId) {
    return jsonResponse(req, 400, { ok: false, message: 'You cannot remove your own account this way.' })
  }

  const { error: delErr } = await adminClient.auth.admin.deleteUser(targetId)
  if (delErr) {
    return jsonResponse(req, 400, { ok: false, message: 'Unable to complete request' })
  }

  return jsonResponse(req, 200, { ok: true, message: 'User removed' })
})
