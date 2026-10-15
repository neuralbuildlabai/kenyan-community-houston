import { useCallback, useRef, useState } from 'react'

/**
 * Cheap, invisible checks that stop the bots which drive public forms through
 * a browser. Two signals:
 *
 * - a hidden "website" field that people never see and bots happily fill;
 * - a minimum time on the form, because scripts submit in milliseconds.
 *
 * A tripped check should look like success to the bot (show the thank-you
 * state, insert nothing), so it learns nothing worth retrying. Bots that skip
 * the form and call Supabase directly are caught by the database throttle in
 * migration 088 instead.
 */

/** No person fills and submits one of these forms faster than this. */
export const MIN_FILL_MS = 2500

/**
 * Tempting to form-filling bots, but not a name browser autofill maps to a
 * profile field ("company" would match the organization slot).
 */
export const BOT_TRAP_FIELD = 'homepage_url'

export function looksAutomated(trapValue: string, startedAt: number, now = Date.now()): boolean {
  return trapValue.trim() !== '' || now - startedAt < MIN_FILL_MS
}

export function useFormBotGuard() {
  const startedAt = useRef(Date.now())
  const [trapValue, setTrapValue] = useState('')
  const isLikelyBot = useCallback(
    () => looksAutomated(trapValue, startedAt.current),
    [trapValue],
  )
  return { trapValue, setTrapValue, isLikelyBot }
}

/** The database throttle raises `rate_limited`; RPCs raise it too. */
export function isRateLimitedError(error: { message?: string | null } | null | undefined): boolean {
  return Boolean(error?.message?.includes('rate_limited'))
}

export const RATE_LIMITED_MESSAGE =
  'You have sent several submissions in a short time. Please wait an hour and try again.'
