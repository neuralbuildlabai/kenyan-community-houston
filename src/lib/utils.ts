import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const generateSlug = slugify

export function formatDate(dateStr: string, fmt = 'MMMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt)
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr: string): string {
  return formatDate(dateStr, 'MMM d, yyyy')
}

/** KIGH runs on Houston time, whatever timezone the viewer's device is in. */
export const HOUSTON_TIME_ZONE = 'America/Chicago'

/**
 * Today's date in Houston as `yyyy-MM-dd`. `toISOString()` gives the UTC
 * date, which turns over at 6–7 pm Houston time and stamps the evening's
 * records and exports with tomorrow's date.
 */
export function houstonToday(now = new Date()): string {
  // en-CA formats as yyyy-MM-dd.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: HOUSTON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * A timestamp in Houston time, e.g. "Oct 12, 2026 8:15 PM CDT". Date-only
 * strings have no time to convert, so they keep the plain date format.
 */
export function formatDateTime(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return formatDateShort(dateStr)
  const date = parseISO(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat('en-US', {
    timeZone: HOUSTON_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
    .format(date)
    .replace(/, (\d{1,2}:)/, ' $1')
}

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function buildImageUrl(
  bucket: string,
  path: string,
  supabaseUrl: string
): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    published: 'Published',
    unpublished: 'Unpublished',
    archived: 'Archived',
    rejected: 'Rejected',
  }
  return labels[status] ?? capitalizeFirst(status)
}

export function fundVerificationLabel(status: string): string {
  const labels: Record<string, string> = {
    unverified: 'Unverified',
    under_review: 'Under Review',
    verified: 'Verified',
    flagged: 'Flagged',
  }
  return labels[status] ?? capitalizeFirst(status)
}

export function businessTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    free: 'Community',
    verified: 'Verified',
    featured: 'Featured',
    sponsor: 'Sponsor',
  }
  return labels[tier] ?? capitalizeFirst(tier)
}
