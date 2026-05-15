import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Heart,
  Link2,
  Loader2,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { getBrowserOrigin } from '@/lib/siteOrigin'
import type { CommunityFeedCommentListRow, CommunityFeedPostListRow } from '@/lib/communityFeed'
import { mapFeedRpcError } from '@/lib/communityFeed'
import { FEED_POST_TYPES, feedPostTypeLabel, APP_NAME } from '@/lib/constants'
import type { FeedPostType } from '@/lib/types'
import { validatePublicCommunityContent } from '@/lib/communityModeration'

function avatarLetters(display: string): string {
  const d = display.trim()
  if (!d) return '?'
  if (d === APP_NAME) return 'KC'
  const parts = d.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] ?? ''
    const second = parts[1].replace(/\./g, '')
    const b = second[0] ?? ''
    const out = `${a}${b}`.toUpperCase()
    return out || '?'
  }
  return (parts[0][0] ?? '?').toUpperCase()
}

export function CommunityFeedPage() {
  const location = useLocation()
  const { user, loading: authLoading, isAdmin } = useAuth()
  const [posts, setPosts] = useState<CommunityFeedPostListRow[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [approvedMember, setApprovedMember] = useState(false)
  const [limitJson, setLimitJson] = useState<Record<string, unknown> | null>(null)
  const [composerBody, setComposerBody] = useState('')
  const [postType, setPostType] = useState<FeedPostType>('general')
  const [submittingPost, setSubmittingPost] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityFeedCommentListRow[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({})
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({})

  const canEngage = useMemo(() => isAdmin || approvedMember, [isAdmin, approvedMember])

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true)
    const { data, error } = await supabase.rpc('list_community_feed_posts', { p_limit: 40 })
    setLoadingPosts(false)
    if (error) {
      toast.error('Could not load the community feed.')
      setPosts([])
      return
    }
    const rows = (data ?? []) as CommunityFeedPostListRow[]
    setPosts(
      rows.map((r) => ({
        ...r,
        like_count: Number(r.like_count),
        comment_count: Number(r.comment_count),
        is_owner: Boolean(r.is_owner),
      }))
    )
  }, [])

  const loadApprovedAndLimits = useCallback(async () => {
    if (!user?.id) {
      setApprovedMember(false)
      setLimitJson(null)
      return
    }
    const [{ data: ok }, { data: lim }] = await Promise.all([
      supabase.rpc('kigh_is_approved_member'),
      supabase.rpc('feed_post_limit_status'),
    ])
    setApprovedMember(Boolean(ok))
    setLimitJson((lim as Record<string, unknown>) ?? null)
  }, [user?.id])

  const loadMyLikes = useCallback(
    async (postIds: string[]) => {
      if (!user?.id || postIds.length === 0) {
        setLikedPostIds(new Set())
        return
      }
      const { data, error } = await supabase
        .from('feed_reactions')
        .select('post_id')
        .eq('user_id', user.id)
        .eq('reaction_type', 'like')
        .in('post_id', postIds)
      if (error) {
        setLikedPostIds(new Set())
        return
      }
      setLikedPostIds(new Set((data as { post_id: string }[]).map((r) => r.post_id)))
    },
    [user?.id]
  )

  useEffect(() => {
    void loadPosts()
  }, [loadPosts])

  useEffect(() => {
    if (authLoading) return
    void loadApprovedAndLimits()
  }, [authLoading, loadApprovedAndLimits])

  useEffect(() => {
    const ids = posts.map((p) => p.id)
    void loadMyLikes(ids)
  }, [posts, loadMyLikes])

  async function refreshComments(postId: string) {
    setLoadingComments((m) => ({ ...m, [postId]: true }))
    const { data, error } = await supabase.rpc('list_community_feed_comments', { p_post_id: postId })
    setLoadingComments((m) => ({ ...m, [postId]: false }))
    if (error) {
      toast.error('Could not load comments.')
      return
    }
    setCommentsByPost((m) => ({ ...m, [postId]: (data as CommunityFeedCommentListRow[]) ?? [] }))
  }

  async function toggleExpand(postId: string) {
    const next = !expanded[postId]
    setExpanded((e) => ({ ...e, [postId]: next }))
    if (next && !commentsByPost[postId]) {
      await refreshComments(postId)
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || !canEngage) return
    const body = composerBody.trim()
    const pub = validatePublicCommunityContent(body)
    if (!pub.ok) {
      toast.error(pub.reason)
      return
    }
    setSubmittingPost(true)
    const { data, error } = await supabase.rpc('create_feed_post', {
      p_body: body,
      p_post_type: postType,
      p_comments_enabled: true,
    })
    setSubmittingPost(false)
    if (error) {
      toast.error(mapFeedRpcError(error))
      return
    }
    toast.success('Your post is live on the Community Feed.')
    setComposerBody('')
    setPostType('general')
    void loadPosts()
    void loadApprovedAndLimits()
    const id = data as string | null
    if (id) {
      setExpanded((ex) => ({ ...ex, [id]: true }))
      await refreshComments(id)
    }
  }

  async function handleCommentSubmit(postId: string) {
    if (!user?.id || !canEngage) return
    const raw = (commentDraft[postId] ?? '').trim()
    if (raw.length > 200) {
      toast.error('Comments must be 200 characters or less.')
      return
    }
    const pub = validatePublicCommunityContent(raw)
    if (!pub.ok) {
      toast.error(pub.reason)
      return
    }
    setSubmittingComment((m) => ({ ...m, [postId]: true }))
    const { error } = await supabase.rpc('create_feed_comment', { p_post_id: postId, p_body: raw })
    setSubmittingComment((m) => ({ ...m, [postId]: false }))
    if (error) {
      toast.error(mapFeedRpcError(error))
      return
    }
    setCommentDraft((m) => ({ ...m, [postId]: '' }))
    await refreshComments(postId)
    void loadPosts()
  }

  async function toggleCommentsEnabled(postId: string, enabled: boolean) {
    const { error } = await supabase.rpc('toggle_feed_post_comments', {
      p_post_id: postId,
      p_comments_enabled: enabled,
    })
    if (error) {
      toast.error(mapFeedRpcError(error))
      return
    }
    toast.success(enabled ? 'Comments are enabled for this post.' : 'Comments are disabled for this post.')
    void loadPosts()
  }

  async function toggleLike(postId: string) {
    if (!user?.id || !canEngage) return
    setLikeBusy((m) => ({ ...m, [postId]: true }))
    const liked = likedPostIds.has(postId)
    if (liked) {
      const { error } = await supabase
        .from('feed_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('reaction_type', 'like')
      setLikeBusy((m) => ({ ...m, [postId]: false }))
      if (error) {
        toast.error('Could not update your reaction.')
        return
      }
      setLikedPostIds((s) => {
        const n = new Set(s)
        n.delete(postId)
        return n
      })
    } else {
      const { error } = await supabase.from('feed_reactions').insert({
        post_id: postId,
        user_id: user.id,
        reaction_type: 'like',
      })
      setLikeBusy((m) => ({ ...m, [postId]: false }))
      if (error) {
        toast.error('Could not add your like.')
        return
      }
      setLikedPostIds((s) => new Set(s).add(postId))
    }
    void loadPosts()
  }

  function copyPostLink(postId: string) {
    const origin = getBrowserOrigin()
    if (!origin) {
      toast.error('Unable to build a link from this page.')
      return
    }
    const url = `${origin}/community-feed#post-${postId}`
    void navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied to clipboard.'),
      () => toast.error('Could not copy link.')
    )
  }

  const limitReason = typeof limitJson?.reason === 'string' ? limitJson.reason : null
  const canPostComposer = canEngage && limitJson?.can_post === true

  const composerHint = !user
    ? 'Log in as an approved member to post or comment in the Community Feed.'
    : !canEngage
      ? 'Your membership must be approved before you can post or comment in the Community Feed.'
      : limitReason === 'post_daily_limit_reached'
        ? 'You have already posted today. You can post again tomorrow.'
        : limitReason === 'post_weekly_limit_reached'
          ? 'You have reached the weekly limit of 3 posts. Please try again later.'
          : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12 space-y-8">
      <SEOHead title="Community Feed" description="Stay connected with the Kenyan community in Houston." />

      <header className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Community Feed</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Stay connected with what&apos;s happening in the Kenyan community in Houston.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Community posts must remain respectful and appropriate. Please do not share private phone numbers, home
          addresses, or sensitive personal information in public posts or comments. Each comment can be up to 200
          characters.
        </p>
      </header>

      {!user && (
        <Card className="border-primary/20 bg-primary/[0.04]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Sign in to participate
            </CardTitle>
            <CardDescription>
              Log in as an approved member to post or comment in the Community Feed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}>Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {user && canEngage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Share with the community</CardTitle>
            <CardDescription>
              Approved members can post once per day, up to three times per week. Please do not share private phone
              numbers, home addresses, or sensitive personal information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {composerHint && <p className="text-sm text-amber-800 dark:text-amber-200/90">{composerHint}</p>}
            <form onSubmit={(ev) => void handleCreatePost(ev)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="feed-post-type">Post type</Label>
                <Select value={postType} onValueChange={(v) => setPostType(v as FeedPostType)} disabled={!canPostComposer}>
                  <SelectTrigger id="feed-post-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEED_POST_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {feedPostTypeLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feed-composer-body">Your message</Label>
                <Textarea
                  id="feed-composer-body"
                  rows={4}
                  maxLength={2000}
                  disabled={!canPostComposer || submittingPost}
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  placeholder="Share something with your community..."
                />
                <p className="text-xs text-muted-foreground text-right">{composerBody.trim().length} / 2000</p>
              </div>
              <Button type="submit" disabled={!canPostComposer || submittingPost || !composerBody.trim()}>
                {submittingPost ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Posting…
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {user && !canEngage && !authLoading && (
        <Card className="border-amber-500/25 bg-amber-500/[0.04]">
          <CardContent className="pt-6 text-sm text-foreground">
            Your membership must be approved before you can post or comment in the Community Feed.
          </CardContent>
        </Card>
      )}

      <section aria-label="Community feed posts" className="space-y-4">
        <h2 className="text-lg font-semibold sr-only">Recent posts</h2>
        {loadingPosts ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading feed…
          </p>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No posts yet. When members share updates, they will appear here.
            </CardContent>
          </Card>
        ) : (
          posts.map((p) => (
            <article
              key={p.id}
              id={`post-${p.id}`}
              className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden scroll-mt-24"
            >
              <div className="p-5 space-y-3">
                <div className="flex gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold"
                    aria-hidden
                  >
                    {avatarLetters(p.author_display_name)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground truncate">{p.author_display_name}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {feedPostTypeLabel[p.post_type as FeedPostType] ?? p.post_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(p.created_at, 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{p.body}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant={likedPostIds.has(p.id) ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    disabled={!canEngage || Boolean(likeBusy[p.id])}
                    onClick={() => void toggleLike(p.id)}
                  >
                    <Heart className={`h-3.5 w-3.5 ${likedPostIds.has(p.id) ? 'fill-current' : ''}`} />
                    {p.like_count}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void toggleExpand(p.id)}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    {p.comment_count}
                    {expanded[p.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => copyPostLink(p.id)}>
                    <Link2 className="h-3.5 w-3.5" />
                    Copy link
                  </Button>
                </div>
                {user?.id && p.is_owner && canEngage && (
                  <div className="pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() => void toggleCommentsEnabled(p.id, !p.comments_enabled)}
                    >
                      {p.comments_enabled ? 'Disable comments on this post' : 'Enable comments on this post'}
                    </Button>
                  </div>
                )}
              </div>

              {expanded[p.id] && (
                <div className="border-t bg-muted/20 px-5 py-4 space-y-4">
                  {!p.comments_enabled && (
                    <p className="text-sm text-muted-foreground">
                      {isAdmin
                        ? 'Comments are turned off for members on this post. You can still add an official moderation comment if needed.'
                        : 'Comments are disabled for this post.'}
                    </p>
                  )}
                  {loadingComments[p.id] ? (
                    <p className="text-xs text-muted-foreground">Loading comments…</p>
                  ) : (
                    <ul className="space-y-3">
                      {(commentsByPost[p.id] ?? []).map((c) => (
                        <li key={c.id} className="text-sm">
                          <div className="flex gap-2">
                            <span className="font-medium text-foreground shrink-0">{c.author_display_name}</span>
                            <span className="text-muted-foreground text-xs shrink-0">
                              {formatDate(c.created_at, 'MMM d')}
                            </span>
                          </div>
                          <p className="text-foreground whitespace-pre-wrap mt-0.5">{c.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canEngage && (p.comments_enabled || isAdmin) ? (
                    <div className="space-y-2">
                      <Label htmlFor={`comment-${p.id}`} className="text-xs">
                        Add a comment
                      </Label>
                      <Textarea
                        id={`comment-${p.id}`}
                        rows={2}
                        maxLength={200}
                        value={commentDraft[p.id] ?? ''}
                        onChange={(e) => setCommentDraft((m) => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="Keep comments respectful and under 200 characters."
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {(commentDraft[p.id] ?? '').trim().length} / 200
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1.5"
                          disabled={Boolean(submittingComment[p.id]) || !(commentDraft[p.id] ?? '').trim()}
                          onClick={() => void handleCommentSubmit(p.id)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Comment
                        </Button>
                      </div>
                    </div>
                  ) : !user ? (
                    <p className="text-sm text-muted-foreground">
                      <Link className="text-primary underline" to={`/login?next=${encodeURIComponent(location.pathname)}`}>
                        Sign in
                      </Link>{' '}
                      as an approved member to comment.
                    </p>
                  ) : !canEngage ? (
                    <p className="text-sm text-muted-foreground">
                      Your membership must be approved before you can comment in the Community Feed.
                    </p>
                  ) : null}
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <p className="text-xs text-center text-muted-foreground">
        {APP_NAME} — community feed is moderated for safety. Thank you for helping keep this space welcoming.
      </p>
    </div>
  )
}
