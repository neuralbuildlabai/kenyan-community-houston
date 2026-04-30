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

export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, 'MMM d, yyyy h:mm a')
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
