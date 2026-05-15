import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { EventComment } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { validatePublicCommunityContent } from '@/lib/communityModeration'

type Props = {
  eventId: string
}

function friendlySubmitError(err: { message?: string } | null): string {
  const m = err?.message ?? ''
  if (m.includes('inappropriate_content')) {
    return 'Please revise your message. Community posts must remain respectful and appropriate.'
  }
  if (m.includes('private_information_sharing')) {
    return 'Please avoid sharing private phone numbers, home addresses, or sensitive personal details in public community posts.'
  }
  if (m.includes('event_comments_body_len') || m.includes('violates check constraint')) {
    return 'Please keep your question between 1 and 2,000 characters.'
  }
  if (m.includes('authentication') || m.includes('JWT')) {
    return 'Please sign in to post a question.'
  }
  return 'Could not submit your question. Please try again.'
}

export function EventComments({ eventId }: Props) {
  const { user } = useAuth()
  const location = useLocation()
  const [approved, setApproved] = useState<EventComment[]>([])
  const [pendingMine, setPendingMine] = useState<EventComment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: pub, error: e1 } = await supabase
        .from('event_comments')
        .select('id, event_id, user_id, body, status, parent_comment_id, created_at, updated_at')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true })

      if (e1) throw e1
      setApproved((pub as EventComment[]) ?? [])

      if (user?.id) {
        const { data: mine, error: e2 } = await supabase
          .from('event_comments')
          .select('id, event_id, user_id, body, status, parent_comment_id, created_at, updated_at')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        if (e2) throw e2
        setPendingMine((mine as EventComment[]) ?? [])
      } else {
        setPendingMine([])
      }
    } catch {
      toast.error('Could not load questions for this event.')
      setApproved([])
      setPendingMine([])
    } finally {
      setLoading(false)
    }
  }, [eventId, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Please sign in to ask a question.')
      return
    }
    const trimmed = body.trim()
    if (trimmed.length < 1 || trimmed.length > 2000) {
      toast.error('Please enter between 1 and 2,000 characters.')
      return
    }
    const pub = validatePublicCommunityContent(trimmed)
    if (!pub.ok) {
      toast.error(pub.reason)
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('event_comments').insert({
      event_id: eventId,
      user_id: user.id,
      body: trimmed,
      status: 'pending',
    })
    setSubmitting(false)
    if (error) {
      toast.error(friendlySubmitError(error))
      return
    }
    toast.success('Your comment was submitted and is pending review.')
    setBody('')
    void load()
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-card/40 shadow-sm overflow-hidden" aria-labelledby="event-comments-heading">
      <Card className="border-0 shadow-none rounded-none">
        <CardHeader className="border-b bg-muted/25">
          <CardTitle id="event-comments-heading" className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Questions & Comments
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Approved questions appear here after moderation. This is not a live anonymous chat — submissions are reviewed for the community’s safety.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              {approved.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-center">
                  No published questions yet. Check back after leadership has reviewed submissions.
                </p>
              ) : (
                <ul className="space-y-4">
                  {approved.map((c) => (
                    <li key={c.id} className="rounded-lg border bg-background/80 px-4 py-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.body}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDate(c.created_at, 'MMM d, yyyy')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {!user && (
                <div className="rounded-lg bg-primary/[0.06] border border-primary/15 px-4 py-4 text-sm">
                  <p className="text-foreground font-medium mb-2">Log in to ask a question about this event</p>
                  <p className="text-muted-foreground mb-3">
                    Questions are reviewed before they appear publicly so the community can stay informed safely.
                  </p>
                  <Button asChild size="sm">
                    <Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              )}

              {user && (
                <div className="space-y-3">
                  {pendingMine.length > 0 && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-foreground">
                      <p className="font-medium">Pending review</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Your recent submission will appear publicly only after the team approves it.
                      </p>
                      <ul className="mt-2 space-y-2">
                        {pendingMine.map((c) => (
                          <li key={c.id} className="text-sm whitespace-pre-wrap border-t border-amber-500/10 pt-2 first:border-0 first:pt-0">
                            {c.body}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-comment-body">Your question</Label>
                      <Textarea
                        id="event-comment-body"
                        rows={4}
                        maxLength={2000}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Ask about schedule, location, accessibility, or what to bring…"
                        disabled={submitting}
                      />
                      <p className="text-xs text-muted-foreground text-right">{body.trim().length} / 2000</p>
                    </div>
                    <Button type="submit" disabled={submitting || !body.trim()}>
                      {submitting ? 'Submitting…' : 'Submit question'}
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
