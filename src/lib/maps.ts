/**
 * Build a Google Maps search URL (no API key; opens Maps in browser).
 * Prefer street address when present; otherwise use venue/location label.
 */
export function googleMapsSearchUrl(args: {
  address?: string | null
  location?: string | null
}): string | null {
  const addr = (args.address ?? '').trim()
  const loc = (args.location ?? '').trim()
  const q = addr || loc
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
