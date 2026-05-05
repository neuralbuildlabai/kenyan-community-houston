import { supabase } from '@/lib/supabase'

const SESSION_KEY = 'kigh_analytics_session_id'
const META_MAX_CHARS = 3500

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function clampMeta(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta || typeof meta !== 'object') return {}
  try {
    const s = JSON.stringify(meta)
    if (s.length <= META_MAX_CHARS) return meta
    return { _truncated: true, preview: s.slice(0, 500) }
  } catch {
    return {}
  }
}

async function insertEvent(payload: {
  event_name: string
  event_type: string
  path?: string | null
  entity_table?: string | null
  entity_id?: string | null
  label?: string | null
  metadata?: Record<string, unknown>
  user_id?: string | null
}) {
  try {
    const { error } = await supabase.from('analytics_events').insert([
      {
        event_name: payload.event_name,
        event_type: payload.event_type,
        path: payload.path ?? null,
        entity_table: payload.entity_table ?? null,
        entity_id: payload.entity_id ?? null,
        label: payload.label ?? null,
        metadata: clampMeta(payload.metadata),
        user_id: payload.user_id ?? null,
        session_id: getSessionId(),
      },
    ])
    if (error) {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', error.message)
    }
  } catch {
    /* fail silently */
  }
}

export async function trackPageView(path: string) {
  const p = path.slice(0, 2048)
  await insertEvent({
    event_name: 'page_view',
    event_type: 'page_view',
    path: p,
    metadata: { path: p },
  })
}

export async function trackClick(label: string, path?: string, metadata?: Record<string, unknown>) {
  await insertEvent({
    event_name: label.slice(0, 120),
    event_type: 'cta_click',
    path: path?.slice(0, 2048) ?? null,
    label: label.slice(0, 200),
    metadata: { ...(metadata ?? {}), path: path ?? null },
  })
}

export async function trackEntityView(
  entityTable: string,
  entityId: string,
  label?: string,
  path?: string
) {
  await insertEvent({
    event_name: label?.slice(0, 120) ?? `${entityTable}_view`,
    event_type: 'entity_view',
    entity_table: entityTable.replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 64),
    entity_id: entityId,
    path: path?.slice(0, 2048) ?? null,
    metadata: { entity_table: entityTable, entity_id: entityId },
  })
}

export async function trackEntityClick(
  entityTable: string,
  entityId: string,
  label?: string,
  path?: string,
  metadata?: Record<string, unknown>
) {
  await insertEvent({
    event_name: label?.slice(0, 120) ?? `${entityTable}_click`,
    event_type: 'entity_click',
    entity_table: entityTable.replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 64),
    entity_id: entityId,
    path: path?.slice(0, 2048) ?? null,
    metadata: { ...(metadata ?? {}), entity_table: entityTable, entity_id: entityId },
  })
}

/** Auth login success — call after session is established (no passwords). */
export async function trackLogin(kind: 'admin_login' | 'member_login', userId?: string | null) {
  await insertEvent({
    event_name: kind,
    event_type: 'login',
    path: typeof window !== 'undefined' ? window.location.pathname : null,
    user_id: userId ?? null,
    metadata: { kind },
  })
}

export async function trackSubmissionCreated(kind: string) {
  await insertEvent({
    event_name: `submission_${kind}`.slice(0, 120),
    event_type: 'submission_created',
    path: typeof window !== 'undefined' ? window.location.pathname : null,
    metadata: { kind },
  })
}

export async function trackMapOpen(label: string, queryPreview?: string) {
  await insertEvent({
    event_name: 'map_open',
    event_type: 'map_open',
    path: typeof window !== 'undefined' ? window.location.pathname : null,
    label: label.slice(0, 200),
    metadata: { query_preview: (queryPreview ?? '').slice(0, 200) },
  })
}
