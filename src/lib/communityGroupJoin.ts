/**
 * Community group join requests (migration 079).
 *
 * Groups run their own membership, so a request goes to KIGH admins, who
 * forward it to the group's contact person from /admin/community-groups.
 */

export const JOIN_REQUEST_STATUSES = ['new', 'forwarded', 'closed'] as const
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number]

export const JOIN_REQUEST_STATUS_LABEL: Record<JoinRequestStatus, string> = {
  new: 'New',
  forwarded: 'Forwarded to group',
  closed: 'Closed',
}

export const JOIN_MESSAGE_MAX = 1000

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/** Client-side check mirroring the RPC; returns a user-facing error or null. */
export function validateJoinRequestInput(input: { name: string; email: string; message?: string }): string | null {
  const name = input.name.trim()
  if (name.length < 2 || name.length > 120) return 'Please enter your name.'
  const email = input.email.trim()
  if (!EMAIL_RE.test(email) || email.length > 254) return 'Please enter a valid email address.'
  if ((input.message ?? '').trim().length > JOIN_MESSAGE_MAX) {
    return `Please keep your message under ${JOIN_MESSAGE_MAX} characters.`
  }
  return null
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  name_required: 'Please enter your name.',
  invalid_name: 'Please enter your name without restricted language.',
  invalid_email: 'Please enter a valid email address.',
  invalid_phone: 'Please enter a valid phone number, or leave it blank.',
  invalid_message: 'Please shorten your message or remove restricted language.',
  group_not_found: 'This group is no longer accepting requests through the directory.',
  rate_limited: 'You have sent several requests today. Please try again tomorrow.',
}

/** Map an RPC error message (which carries our raised code) to user-facing copy. */
export function joinRequestErrorMessage(raw: string | null | undefined): string {
  const text = raw ?? ''
  const code = Object.keys(RPC_ERROR_MESSAGES).find((c) => text.includes(c))
  if (code) return RPC_ERROR_MESSAGES[code]
  return 'We could not send your request right now. Please try again shortly.'
}

type GroupContactFields = {
  contact_person_email?: string | null
  public_email?: string | null
  submitter_email?: string | null
}

/**
 * Who should hear about a join request: the group's named outreach contact,
 * then its public inbox, then whoever registered the listing.
 */
export function resolveGroupContactEmail(group: GroupContactFields | null | undefined): string | null {
  if (!group) return null
  for (const candidate of [group.contact_person_email, group.public_email, group.submitter_email]) {
    const email = candidate?.trim()
    if (email && EMAIL_RE.test(email)) return email
  }
  return null
}

export type JoinRequestForward = {
  groupName: string
  contactName?: string | null
  contactEmail: string
  requesterName: string
  requesterEmail: string
  requesterPhone?: string | null
  message?: string | null
  requestedAt: string
}

/** Prefilled email an admin sends to the group contact to pass a request on. */
export function buildJoinRequestForwardMailto(f: JoinRequestForward): string {
  const greeting = f.contactName?.trim() ? `Hello ${f.contactName.trim()},` : 'Hello,'
  const when = new Date(f.requestedAt)
  const whenLabel = Number.isNaN(when.getTime())
    ? f.requestedAt
    : when.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const lines = [
    greeting,
    '',
    `Someone asked to join ${f.groupName} through the Kenyans in Greater Houston community groups directory on ${whenLabel}.`,
    '',
    `Name: ${f.requesterName}`,
    `Email: ${f.requesterEmail}`,
    ...(f.requesterPhone?.trim() ? [`Phone: ${f.requesterPhone.trim()}`] : []),
    ...(f.message?.trim() ? ['', 'Their message:', f.message.trim()] : []),
    '',
    'Please reach out to them directly with next steps for joining.',
    '',
    'Thank you,',
    'Kenyans in Greater Houston',
  ]

  const subject = `New request to join ${f.groupName}`
  return `mailto:${encodeURIComponent(f.contactEmail)}?cc=${encodeURIComponent(f.requesterEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}
