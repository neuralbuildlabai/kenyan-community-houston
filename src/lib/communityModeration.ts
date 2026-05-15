/**
 * Client-side first-pass moderation for community text (feed, comments,
 * invites, requests). Keep aligned with SQL helpers in migration 032.
 * Do not surface blocked terms in user-facing copy or logs.
 */

export const COMMUNITY_MSG_PROFANITY =
  'Please revise your message. Community posts must remain respectful and appropriate.'

export const COMMUNITY_MSG_PRIVATE =
  'Please avoid sharing private phone numbers, home addresses, or sensitive personal details in public community posts.'

export const COMMUNITY_MSG_SAFETY =
  'This message cannot be posted because it appears to violate community safety rules.'

/** Multi-word or severe phrases (checked before single-token list). */
const BLOCKED_PHRASES: string[] = [
  'kill yourself',
  'kys',
  'die in a fire',
  'go die',
  'heil hitler',
  'white power',
]

/** Single-token blocked roots; must stay loosely in sync with SQL migration 032. */
const BLOCKED_TERMS: string[] = [
  'fuck',
  'fucking',
  'fucked',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'bastard',
  'asshole',
  'damn',
  'crap',
  'piss',
  'dick',
  'cock',
  'cunt',
  'pussy',
  'slut',
  'whore',
  'retard',
  'retarded',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'chink',
  'spic',
  'kike',
  'wetback',
  'terrorist',
  'rape',
  'raping',
  'molest',
  'nazi',
  'lynch',
  'n1gger',
  'f4g',
  'sh1t',
  'fuk',
  'fck',
]

const THREAT_TERMS: string[] = ['kill you', 'i will hurt', 'i will kill', 'threat to']

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE_RE = /(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/
const ADDRESS_RE =
  /[0-9]{1,6}\s+[a-z0-9'\s-]{2,40}\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard)([^a-z]|$)/i

export function normalizeCommunityText(input: string): string {
  const t = (input ?? '').trim().toLowerCase()
  return t.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function denseAlphaNumeric(input: string): string {
  return normalizeCommunityText(input).replace(/\s/g, '')
}

export function containsBlockedCommunityLanguage(input: string): boolean {
  const norm = ` ${normalizeCommunityText(input)} `
  for (const p of BLOCKED_PHRASES) {
    if (norm.includes(` ${p} `)) return true
  }
  for (const t of THREAT_TERMS) {
    if (norm.includes(t)) return true
  }
  for (const w of BLOCKED_TERMS) {
    if (norm.includes(` ${w} `)) return true
  }
  const dense = denseAlphaNumeric(input)
  for (const w of BLOCKED_TERMS) {
    if (w.length >= 4 && dense.includes(w)) return true
  }
  return false
}

export function containsLikelyPrivateContactSharing(input: string): boolean {
  const t = (input ?? '').trim()
  if (EMAIL_RE.test(t)) return true
  if (PHONE_RE.test(t)) return true
  if (ADDRESS_RE.test(t)) return true
  return false
}

export function containsThreatOrHarassmentHeuristic(input: string): boolean {
  const n = normalizeCommunityText(input)
  return THREAT_TERMS.some((t) => n.includes(t))
}

export type CommunityValidation = { ok: true } | { ok: false; reason: string }

/** General moderation (requests, invites with relaxed phone rules for invite flows). */
export const COMMUNITY_MSG_REQUIRED = 'Please enter a message.'

export function validateCommunityContent(input: string): CommunityValidation {
  const t = (input ?? '').trim()
  if (!t) return { ok: false, reason: COMMUNITY_MSG_REQUIRED }
  if (containsThreatOrHarassmentHeuristic(t)) return { ok: false, reason: COMMUNITY_MSG_SAFETY }
  if (containsBlockedCommunityLanguage(t)) return { ok: false, reason: COMMUNITY_MSG_PROFANITY }
  return { ok: true }
}

/** Stricter checks for public feed-style surfaces. */
export function validatePublicCommunityContent(input: string): CommunityValidation {
  const t = (input ?? '').trim()
  if (!t) return { ok: false, reason: COMMUNITY_MSG_REQUIRED }
  if (containsThreatOrHarassmentHeuristic(t)) return { ok: false, reason: COMMUNITY_MSG_SAFETY }
  if (containsBlockedCommunityLanguage(t)) return { ok: false, reason: COMMUNITY_MSG_PROFANITY }
  if (containsLikelyPrivateContactSharing(t)) return { ok: false, reason: COMMUNITY_MSG_PRIVATE }
  return { ok: true }
}
