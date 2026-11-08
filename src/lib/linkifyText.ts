/**
 * Split plain text into text and link segments so free-text fields (event
 * descriptions) can render pasted URLs as tappable links. Only http(s) URLs
 * and bare www. hosts become links; trailing punctuation stays as text.
 */
export type LinkifySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string }

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/

export function linkifyText(text: string | null | undefined): LinkifySegment[] {
  if (!text) return []
  const out: LinkifySegment[] = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0
    let url = match[0]
    const trail = url.match(TRAILING_PUNCT)?.[0] ?? ''
    if (trail) url = url.slice(0, -trail.length)
    if (!url) continue
    if (start > last) out.push({ type: 'text', value: text.slice(last, start) })
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    out.push({ type: 'link', value: url, href })
    last = start + url.length
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
  return out
}
