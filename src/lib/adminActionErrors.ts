import type { PostgrestError } from '@supabase/supabase-js'

/** User-facing message for failed admin mutations (no raw stack traces). */
export function formatAdminActionError(error: PostgrestError | Error | null | undefined): string {
  if (!error) return 'Action failed. Please try again.'
  const code = 'code' in error ? error.code : undefined
  const message = error.message ?? ''

  if (code === '42501' || /forbidden/i.test(message)) {
    return 'You do not have permission to perform this action. Sign out and back in if you were recently granted admin access.'
  }
  if (code === '28000' || /not_authenticated/i.test(message)) {
    return 'Your session expired. Sign in again to continue.'
  }
  if (/member_not_found/i.test(message)) return 'Member record was not found.'
  if (/gallery_image_not_found/i.test(message)) return 'Gallery image was not found.'
  if (/invalid_membership_status/i.test(message)) return 'Invalid membership status.'
  if (/invalid_dues_status/i.test(message)) return 'Invalid dues status.'
  if (/invalid_gallery_status/i.test(message)) return 'Invalid gallery status.'

  if (message.length > 0 && message.length < 200) return message
  return 'Action failed. Please try again or contact platform support.'
}
