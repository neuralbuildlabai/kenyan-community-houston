/** Row shape returned by `list_community_feed_posts`. */
export interface CommunityFeedPostListRow {
  id: string
  body: string
  post_type: string
  comments_enabled: boolean
  created_at: string
  author_display_name: string
  like_count: number
  comment_count: number
  is_owner: boolean
}

/** Row shape returned by `list_community_feed_comments`. */
export interface CommunityFeedCommentListRow {
  id: string
  body: string
  created_at: string
  author_display_name: string
}

export function mapFeedRpcError(err: { message?: string } | null): string {
  const m = err?.message ?? ''
  if (m.includes('not_approved_member')) {
    return 'Your membership must be approved before you can use the Community Feed.'
  }
  if (m.includes('post_daily_limit_reached')) {
    return 'You have already posted today. You can post again tomorrow.'
  }
  if (m.includes('post_weekly_limit_reached')) {
    return 'You have reached the weekly limit of 3 posts. Please try again later.'
  }
  if (m.includes('inappropriate_content')) {
    return 'Please revise your message. Community posts must remain respectful and appropriate.'
  }
  if (m.includes('private_information_sharing')) {
    return 'Please avoid sharing private phone numbers, home addresses, or sensitive personal details in public community posts.'
  }
  if (m.includes('invalid_post_type')) return 'Please choose a valid post type.'
  if (m.includes('body_too_long')) return 'Posts must be 2,000 characters or less.'
  if (m.includes('body_required')) return 'Please enter a message for your post.'
  if (m.includes('comments_disabled')) return 'Comments are disabled for this post.'
  if (m.includes('comment_too_long')) return 'Comments must be 200 characters or less.'
  if (m.includes('comment_required')) return 'Please enter a comment.'
  if (m.includes('post_not_available')) return 'This post is not available.'
  if (m.includes('authentication_required')) return 'Please sign in to continue.'
  return 'Something went wrong. Please try again.'
}

export function mapChatRequestModerationError(message: string): string | null {
  if (message.includes('inappropriate_content')) {
    return 'Please revise your message. Community posts must remain respectful and appropriate.'
  }
  if (message.includes('private_information_sharing')) {
    return 'Please avoid sharing private phone numbers, home addresses, or sensitive personal details in public community posts.'
  }
  return null
}

export function mapChatMessageModerationError(message: string): string | null {
  return mapChatRequestModerationError(message)
}
