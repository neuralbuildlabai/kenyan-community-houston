import { useCallback, useEffect, useMemo, useState } from 'react'
import { Newspaper, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { FeedComment, FeedPost } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { formatCommunityDisplayName } from '@/lib/memberDisplayName'
import { FEED_MODERATION_REASON_PRESETS, feedPostTypeLabel, feedStatusLabel } from '@/lib/constants'
import type { FeedPostType } from '@/lib/types'

const POST_STATUSES = ['all', 'approved', 'hidden', 'removed'] as const
const COMMENT_STATUSES = ['all', 'approved', 'hidden', 'removed'] as const

export function AdminFeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [comments, setComments] = useState<FeedComment[]>([])
  const [postFilter, setPostFilter] = useState<(typeof POST_STATUSES)[number]>('all')
  const [commentFilter, setCommentFilter] = useState<(typeof COMMENT_STATUSES)[number]>('all')
  const [loading, setLoading] = useState(true)
  const [reasonByPost, setReasonByPost] = useState<Record<string, string>>({})
  const [reasonByComment, setReasonByComment] = useState<Record<string, string>>({})
  const [memberNames, setMemberNames] = useState<Record<string, { first_name: string; last_name: string }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    let pq = supabase.from('feed_posts').select('*').order('created_at', { ascending: false })
    if (postFilter !== 'all') pq = pq.eq('status', postFilter)
    const { data: pdata, error: perr } = await pq

    let cq = supabase.from('feed_comments').select('*').order('created_at', { ascending: false })
    if (commentFilter !== 'all') cq = cq.eq('status', commentFilter)
    const { data: cdata, error: cerr } = await cq

    setLoading(false)
    if (perr || cerr) {
      toast.error('Could not load feed moderation data.')
      setPosts([])
      setComments([])
      return
    }
    const plist = (pdata as FeedPost[]) ?? []
    const clist = (cdata as FeedComment[]) ?? []
    setPosts(plist)
    setComments(clist)

    const uids = [...new Set([...plist.map((p) => p.author_id), ...clist.map((c) => c.author_id)])]
    if (uids.length) {
      const { data: mems } = await supabase
        .from('members')
        .select('user_id, first_name, last_name')
        .in('user_id', uids)
      const map: Record<string, { first_name: string; last_name: string }> = {}
      for (const m of (mems as { user_id: string; first_name: string; last_name: string }[]) ?? []) {
        if (m.user_id) map[m.user_id] = { first_name: m.first_name, last_name: m.last_name }
      }
      setMemberNames(map)
    } else {
      setMemberNames({})
    }
  }, [postFilter, commentFilter])

  useEffect(() => {
    void load()
  }, [load])

  const emptyPosts = useMemo(() => !loading && posts.length === 0, [loading, posts.length])
  const emptyComments = useMemo(() => !loading && comments.length === 0, [loading, comments.length])

  function safeAuthor(uid: string): string {
    const m = memberNames[uid]
    if (m) return formatCommunityDisplayName(m.first_name, m.last_name)
    return 'Community Member'
  }

  async function moderatePost(id: string, status: 'approved' | 'hidden' | 'removed') {
    const preset = reasonByPost[id] ?? 'other'
    const { error } = await supabase.rpc('moderate_feed_post', {
      p_post_id: id,
      p_status: status,
      p_reason: preset,
    })
    if (error) {
      toast.error('Could not update post.')
      return
    }
    toast.success('Post updated.')
    void load()
  }

  async function moderateComment(id: string, status: 'approved' | 'hidden' | 'removed') {
    const preset = reasonByComment[id] ?? 'other'
    const { error } = await supabase.rpc('moderate_feed_comment', {
      p_comment_id: id,
      p_status: status,
      p_reason: preset,
    })
    if (error) {
      toast.error('Could not update comment.')
      return
    }
    toast.success('Comment updated.')
    void load()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-7 w-7 text-primary" />
            Community Feed Moderation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review member posts and comments. Prefer hiding or removing content rather than deleting database rows.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2 self-start" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Posts</CardTitle>
            <CardDescription>Filter by moderation status.</CardDescription>
          </div>
          <Select value={postFilter} onValueChange={(v) => setPostFilter(v as typeof postFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All statuses' : feedStatusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : emptyPosts ? (
            <p className="text-sm text-muted-foreground py-12 text-center border border-dashed rounded-lg">
              No posts in this view.
            </p>
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <div key={p.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant={p.status === 'approved' ? 'default' : 'secondary'}>{feedStatusLabel[p.status]}</Badge>
                      <Badge variant="outline">{feedPostTypeLabel[p.post_type as FeedPostType] ?? p.post_type}</Badge>
                      <span className="text-sm font-medium">{safeAuthor(p.author_id)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(p.created_at, 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.body}</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Reason preset</Label>
                      <Select
                        value={reasonByPost[p.id] ?? 'other'}
                        onValueChange={(v) => setReasonByPost((m) => ({ ...m, [p.id]: v }))}
                      >
                        <SelectTrigger className="w-[200px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEED_MODERATION_REASON_PRESETS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {p.status !== 'hidden' && (
                      <Button type="button" size="sm" variant="secondary" onClick={() => void moderatePost(p.id, 'hidden')}>
                        Hide post
                      </Button>
                    )}
                    {p.status !== 'removed' && (
                      <Button type="button" size="sm" variant="destructive" onClick={() => void moderatePost(p.id, 'removed')}>
                        Remove post
                      </Button>
                    )}
                    {p.status !== 'approved' && (
                      <Button type="button" size="sm" variant="outline" onClick={() => void moderatePost(p.id, 'approved')}>
                        Restore post
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Comments</CardTitle>
            <CardDescription>Moderate individual feed comments.</CardDescription>
          </div>
          <Select value={commentFilter} onValueChange={(v) => setCommentFilter(v as typeof commentFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All statuses' : feedStatusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : emptyComments ? (
            <p className="text-sm text-muted-foreground py-12 text-center border border-dashed rounded-lg">
              No comments in this view.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge variant={c.status === 'approved' ? 'default' : 'secondary'}>{feedStatusLabel[c.status]}</Badge>
                      <span className="text-xs text-muted-foreground">Post {c.post_id.slice(0, 8)}…</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(c.created_at, 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Author (safe): {safeAuthor(c.author_id)}</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.body}</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Reason preset</Label>
                      <Select
                        value={reasonByComment[c.id] ?? 'other'}
                        onValueChange={(v) => setReasonByComment((m) => ({ ...m, [c.id]: v }))}
                      >
                        <SelectTrigger className="w-[200px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEED_MODERATION_REASON_PRESETS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {c.status !== 'hidden' && (
                      <Button type="button" size="sm" variant="secondary" onClick={() => void moderateComment(c.id, 'hidden')}>
                        Hide comment
                      </Button>
                    )}
                    {c.status !== 'removed' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void moderateComment(c.id, 'removed')}
                      >
                        Remove comment
                      </Button>
                    )}
                    {c.status !== 'approved' && (
                      <Button type="button" size="sm" variant="outline" onClick={() => void moderateComment(c.id, 'approved')}>
                        Restore comment
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
