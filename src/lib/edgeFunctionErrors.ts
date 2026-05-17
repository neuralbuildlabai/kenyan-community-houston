import { FunctionsHttpError } from '@supabase/supabase-js'

function messageFromPayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim()
  if (typeof record.error === 'string' && record.error.trim()) return record.error.trim()
  return null
}

/** Surface Edge Function JSON `message` or a clear network/CORS hint. */
export async function formatEdgeFunctionInvokeError(
  functionName: string,
  error: Error | null,
  data: unknown
): Promise<string> {
  const fromBody = messageFromPayload(data)
  if (fromBody) return fromBody

  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json()
      const fromHttp = messageFromPayload(payload)
      if (fromHttp) return fromHttp
    } catch {
      // ignore parse errors
    }
  }

  const raw = error?.message ?? ''
  if (/failed to fetch|cors|network/i.test(raw)) {
    return `Could not reach ${functionName}. Deploy the Edge Function and ensure CORS allows this site.`
  }

  return raw || `Could not reach ${functionName}.`
}
