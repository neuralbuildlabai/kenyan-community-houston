/** DB `chat_threads.category` values (migration 030). */
export const CHAT_REQUEST_CATEGORY_VALUES = [
  'general',
  'events',
  'membership',
  'business_services',
  'volunteering',
  'community_support',
  'new_to_houston',
  'technical_support',
  'other',
] as const

export type ChatRequestCategory = (typeof CHAT_REQUEST_CATEGORY_VALUES)[number]

export const CHAT_REQUEST_CATEGORY_LABEL: Record<ChatRequestCategory, string> = {
  general: 'General',
  events: 'Events',
  membership: 'Membership',
  business_services: 'Business & Services',
  volunteering: 'Volunteering',
  community_support: 'Community Support',
  new_to_houston: 'New to Houston',
  technical_support: 'Technical Support',
  other: 'Other',
}

export function chatCategoryLabel(cat: string | null | undefined): string {
  if (!cat) return 'General'
  const k = cat as ChatRequestCategory
  return CHAT_REQUEST_CATEGORY_LABEL[k] ?? cat
}

/** Active workflow statuses (at most one row per user with these). */
export const CHAT_THREAD_ACTIVE_STATUSES = ['open', 'pending_admin', 'pending_member'] as const
export type ChatThreadActiveStatus = (typeof CHAT_THREAD_ACTIVE_STATUSES)[number]

export const CHAT_THREAD_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  pending_admin: 'Awaiting team',
  pending_member: 'Awaiting you',
  closed: 'Closed',
  archived: 'Archived',
}

export function chatStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown'
  return CHAT_THREAD_STATUS_LABEL[status] ?? status.replace(/_/g, ' ')
}

export const CHAT_THREAD_PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

/** Member close presets (stored in `close_reason`). */
export const CHAT_CLOSE_REASON_PRESETS = [
  { value: 'Resolved', label: 'Resolved' },
  { value: 'No longer needed', label: 'No longer needed' },
  { value: 'Found help elsewhere', label: 'Found help' },
  { value: 'Opened by mistake', label: 'Opened by mistake' },
  { value: 'Other', label: 'Other' },
] as const

export function isChatThreadActive(status: string | null | undefined): boolean {
  return !!status && (CHAT_THREAD_ACTIVE_STATUSES as readonly string[]).includes(status)
}
