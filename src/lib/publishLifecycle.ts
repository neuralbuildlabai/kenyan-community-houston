/**
 * Canonical timestamps for admin moderation / publish flows so public listings
 * (status + published_at + ordering) stay aligned with admin actions.
 */
export function isoNow(): string {
  return new Date().toISOString()
}

/** Pending submissions queue (Submissions page): events, announcements, businesses, fundraisers. */
export function pendingQueuePublishPayload() {
  const t = isoNow()
  return {
    status: 'published' as const,
    published_at: t,
    updated_at: t,
  }
}

export function pendingQueueRejectPayload() {
  const t = isoNow()
  return {
    status: 'rejected' as const,
    updated_at: t,
  }
}

/**
 * Status dropdown on admin list pages — keeps published_at in sync when publishing,
 * clears it when moving away from published, and always bumps updated_at.
 */
export function moderationStatusPatch(status: string) {
  const t = isoNow()
  if (status === 'published') {
    return { status, published_at: t, updated_at: t }
  }
  return { status, published_at: null as string | null, updated_at: t }
}
