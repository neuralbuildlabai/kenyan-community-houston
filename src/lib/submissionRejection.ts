/**
 * Reject-with-a-note for the moderation queues (migration 090).
 *
 * `kigh_reject_submission` sets the status, stores the note and who rejected
 * it, and emails the note to the submitter from the KIGH domain (replies go
 * to the KIGH inbox, which also gets a copy). With no email on file it still
 * rejects and returns the phone number and message, so the admin can send it
 * by WhatsApp or text instead.
 */
import { supabase } from '@/lib/supabase'

export const REJECTABLE_TYPES = ['fundraisers', 'events', 'announcements', 'businesses'] as const

export type RejectableType = (typeof REJECTABLE_TYPES)[number]

export const REJECTABLE_TYPE_LABEL: Record<RejectableType, string> = {
  fundraisers: 'fundraiser',
  events: 'event',
  announcements: 'announcement',
  businesses: 'business listing',
}

/** One-click starting points for the note. Admins can edit before sending. */
export const REJECTION_PRESETS: Record<RejectableType, string[]> = {
  fundraisers: [
    'KIGH does not collect or hold funds for individual fundraisers. Please set up your own fundraising page (for example GoFundMe or Givebutter) and resubmit with that link.',
    'We need more detail about who the fundraiser is for and how the money will be used before we can list it.',
    'We could not verify the details of this fundraiser. Please reply with supporting information (for example a letter from the hospital or funeral home).',
  ],
  events: [
    'The event details are incomplete. Please add the date, time and venue and resubmit.',
    'This event is not a fit for the KIGH community calendar.',
    'This event appears to be a duplicate of one already listed.',
  ],
  announcements: [
    'The announcement is missing key details (date, place or contact). Please add them and resubmit.',
    'This reads as an advertisement. Please list businesses through the Business Directory instead.',
    'This announcement is not a fit for the KIGH community board.',
  ],
  businesses: [
    'We could not verify this business. Please add a working website, social media page or phone number and resubmit.',
    'The listing is missing a description of what the business offers.',
    'This business does not appear to be Kenyan-owned or serving the Kenyan community in Greater Houston.',
  ],
}

export interface RejectionResult {
  title: string
  name: string | null
  email: string | null
  phone: string | null
  emailed: boolean
  /** The full plain-text message, for a WhatsApp / text fallback. */
  message: string
}

export const MIN_REJECTION_NOTE_LENGTH = 3
export const MAX_REJECTION_NOTE_LENGTH = 2000

export function rejectionErrorMessage(error: { message?: string | null } | null | undefined): string {
  const message = error?.message ?? ''
  if (message.includes('rejection_note_required')) return 'Write a short note explaining why.'
  if (message.includes('rejection_note_too_long')) return `Keep the note under ${MAX_REJECTION_NOTE_LENGTH} characters.`
  if (message.includes('invalid_email')) return 'That email address does not look right.'
  if (message.includes('forbidden')) return 'Only KIGH admins can reject submissions.'
  if (message.includes('submission_not_found')) return 'This submission no longer exists.'
  return message || 'Could not reject. Please try again.'
}

export async function rejectSubmission({
  type,
  id,
  note,
  notify,
  email,
}: {
  type: RejectableType
  id: string
  note: string
  notify: boolean
  /** Send to this address instead of (or when there is no) email on file. */
  email?: string | null
}): Promise<RejectionResult> {
  const { data, error } = await supabase.rpc('kigh_reject_submission', {
    p_table: type,
    p_id: id,
    p_note: note.trim(),
    p_notify: notify,
    p_email: email?.trim() || null,
  })
  if (error) throw new Error(rejectionErrorMessage(error))
  return data as RejectionResult
}
