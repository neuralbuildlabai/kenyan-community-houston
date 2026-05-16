import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { loginNextFromLocation } from '@/lib/loginNext'
import { Send, Lock, MessageSquare, ShieldCheck, ClipboardList } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { ChatMessage, ChatThread } from '@/lib/types'
import {
  CHAT_CLOSE_REASON_PRESETS,
  CHAT_REQUEST_CATEGORY_LABEL,
  CHAT_REQUEST_CATEGORY_VALUES,
  chatCategoryLabel,
  chatStatusLabel,
  isChatThreadActive,
} from '@/lib/chatRequests'
import { formatDate } from '@/lib/utils'
import { InviteSomeoneDialog } from '@/components/community/InviteSomeoneDialog'
import { validateCommunityContent } from '@/lib/communityModeration'
import { mapChatMessageModerationError } from '@/lib/communityFeed'

function mapCreateRequestError(message: string): string {
  if (message.includes('active_request_already_exists') || message.includes('23505')) {
    return 'You already have an open request. Close it before starting a new one.'
  }
  if (message.includes('invalid_title_length')) return 'Title must be between 5 and 120 characters.'
  if (message.includes('invalid_body_length')) return 'Message must be between 1 and 3,000 characters.'
  if (message.includes('invalid_category')) return 'Please choose a valid category.'
  if (message.includes('authentication_required')) return 'Please sign in to start a request.'
  if (message.includes('inappropriate_content')) {
    return 'Please revise your message. Community posts must remain respectful and appropriate.'
  }
  return 'Could not start your request. Please try again.'
}

export function ChatPage() {
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('general')
  const [firstBody, setFirstBody] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replying, setReplying] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closePreset, setClosePreset] = useState<string>('Resolved')

  const activeThread = threads.find((t) => isChatThreadActive(t.status)) ?? null

  const loadThreads = useCallback(async () => {
    if (!user?.id) {
      setThreads([])
      return
    }
    setLoadingThreads(true)
    const { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
    setLoadingThreads(false)
    if (error) {
      toast.error('Could not load your requests.')
      setThreads([])
      return
    }
    setThreads((data as ChatThread[]) ?? [])
  }, [user?.id])

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, thread_id, sender_id, sender_role, body, is_internal_note, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    setLoadingMessages(false)
    if (error) {
      toast.error('Could not load messages.')
      setMessages([])
      return
    }
    setMessages((data as ChatMessage[]) ?? [])
  }, [])

  useEffect(() => {
    if (authLoading) return
    void loadThreads()
  }, [authLoading, loadThreads])

  useEffect(() => {
    if (activeThread?.id) void loadMessages(activeThread.id)
    else setMessages([])
  }, [activeThread?.id, loadMessages])

  async function handleStartRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    const t = title.trim()
    const b = firstBody.trim()
    if (t.length < 5 || t.length > 120) {
      toast.error('Title must be between 5 and 120 characters.')
      return
    }
    if (b.length < 1 || b.length > 3000) {
      toast.error('Message must be between 1 and 3,000 characters.')
      return
    }
    const mod = validateCommunityContent(b)
    if (!mod.ok) {
      toast.error(mod.reason)
      return
    }
    setSubmitting(true)
    const { data, error } = await supabase.rpc('create_chat_request', {
      p_title: t,
      p_category: category,
      p_body: b,
    })
    setSubmitting(false)
    if (error) {
      toast.error(mapCreateRequestError(error.message ?? ''))
      return
    }
    toast.success('Your request was submitted. The community team will respond when they can.')
    setTitle('')
    setFirstBody('')
    setCategory('general')
    void loadThreads()
    const tid = data as string | null
    if (tid) void loadMessages(tid)
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || !activeThread) return
    const b = replyBody.trim()
    if (b.length < 1 || b.length > 3000) {
      toast.error('Message must be between 1 and 3,000 characters.')
      return
    }
    const modReply = validateCommunityContent(b)
    if (!modReply.ok) {
      toast.error(modReply.reason)
      return
    }
    if (!isChatThreadActive(activeThread.status)) {
      toast.error('This request is closed.')
      return
    }
    setReplying(true)
    const { error } = await supabase.from('chat_messages').insert({
      thread_id: activeThread.id,
      sender_id: user.id,
      sender_role: 'member',
      body: b,
      is_internal_note: false,
    })
    setReplying(false)
    if (error) {
      toast.error(
        mapChatMessageModerationError(error.message ?? '') ??
          'Could not send your message. If the request was closed, start a new one after closing.'
      )
      return
    }
    setReplyBody('')
    void loadMessages(activeThread.id)
    void loadThreads()
  }

  async function confirmClose() {
    if (!activeThread) return
    const reason =
      closePreset === 'Other'
        ? 'Other'
        : CHAT_CLOSE_REASON_PRESETS.find((p) => p.value === closePreset)?.value ?? closePreset
    const { error } = await supabase.rpc('close_chat_request', {
      p_thread_id: activeThread.id,
      p_close_reason: reason,
    })
    if (error) {
      toast.error('Could not close this request. Please try again.')
      return
    }
    toast.success('Request closed. You can start a new one whenever you need.')
    setCloseOpen(false)
    setMessages([])
    void loadThreads()
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <SEOHead
        title="Community Chat"
        description="Ask questions and connect with the Kenyan community in Houston. Members can start a conversation with the community team."
      />

      <div className="relative overflow-hidden min-h-screen">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[url('/kigh-media/backgrounds/communitychat.png')] bg-cover bg-[center_top] opacity-[0.3]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-[#faf7ef]/75 to-white/90"
        />
        <div className="relative z-10">

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            Member space
          </p>
          <h1
            data-testid="chat-hero-title"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          >
            Community Chat
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Ask questions, share updates, and connect with the Kenyan community in Houston.
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <InviteSomeoneDialog />
        </div>

        <div className="space-y-8">

        {!user && (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-white/85 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  Sign in to join the conversation
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  Log in to ask a question, start a conversation, or follow up with the community team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to={loginNextFromLocation(location)} data-testid="chat-sign-in">Sign in</Link>
                </Button>
              </CardContent>
            </Card>

            <section
              data-testid="chat-about-public"
              aria-labelledby="chat-about-heading"
              className="rounded-2xl border border-border/60 bg-white/85 backdrop-blur-sm p-6 sm:p-7 shadow-sm"
            >
              <h2
                id="chat-about-heading"
                className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
              >
                Good topics to start with
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-foreground/85" data-testid="chat-topic-list">
                <li className="flex gap-3">
                  <ClipboardList className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
                  <span>
                    Newcomer questions about schools, housing, licenses, healthcare, or community groups.
                  </span>
                </li>
                <li className="flex gap-3">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
                  <span>
                    Event questions, RSVP details, accessibility needs, or what to bring.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
                  <span>
                    Referrals for trusted local services, family support, or community guidance.
                  </span>
                </li>
                <li className="flex gap-3">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" aria-hidden />
                  <span>Ideas, updates, and conversations that help members stay connected.</span>
                </li>
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground" data-testid="chat-safety-note">
                For emergencies, call 911. For social services, call 211.
              </p>
            </section>
          </div>
        )}

        {user && loadingThreads && (
          <p className="text-sm text-muted-foreground">Loading your requests…</p>
        )}

        {user && !loadingThreads && activeThread && (
          <Card className="border-primary/15 bg-white/85 backdrop-blur-sm shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{activeThread.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {chatCategoryLabel(activeThread.category)} · {chatStatusLabel(activeThread.status)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
                  <div className="space-y-1.5 flex-1 max-w-xs">
                    <Label className="text-xs">Close reason</Label>
                    <Select value={closePreset} onValueChange={setClosePreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHAT_CLOSE_REASON_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => setCloseOpen(true)}>
                    Close request
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="rounded-lg bg-amber-500/[0.08] border border-amber-500/20 px-4 py-3 text-sm text-foreground">
                You already have an open request. Please close it before starting a new one.
              </div>
              <p className="text-xs text-muted-foreground">
                Started {formatDate(activeThread.created_at, 'MMM d, yyyy h:mm a')} · Last activity{' '}
                {formatDate(activeThread.last_message_at, 'MMM d, yyyy h:mm a')}
              </p>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Conversation</h2>
                {loadingMessages ? (
                  <p className="text-sm text-muted-foreground">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {messages.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-xl border px-4 py-3 text-sm ${
                          m.sender_role === 'admin' ? 'bg-primary/[0.06] border-primary/20' : 'bg-muted/30 border-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {m.sender_role === 'admin' ? 'Community team' : 'You'}
                          </span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDate(m.created_at, 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={(ev) => void handleReply(ev)} className="space-y-3 border-t pt-4">
                <Label htmlFor="reply-body">Your reply</Label>
                <Textarea
                  id="reply-body"
                  rows={4}
                  maxLength={3000}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Add details or answer the team’s questions…"
                  disabled={replying}
                />
                <Button type="submit" disabled={replying || !replyBody.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {replying ? 'Sending…' : 'Send message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {user && !loadingThreads && !activeThread && (
          <Card className="shadow-sm border-primary/10 bg-white/85 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Start a Request</CardTitle>
              <CardDescription>
                Describe what you need. A volunteer or board member will get back to you through this thread.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(ev) => void handleStartRequest(ev)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="req-title">Title *</Label>
                  <Input
                    id="req-title"
                    maxLength={120}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Looking for a Kenyan caterer for a small gathering"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground text-right">{title.trim().length} / 120 (min 5)</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory} disabled={submitting}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAT_REQUEST_CATEGORY_VALUES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CHAT_REQUEST_CATEGORY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="req-body">Message *</Label>
                  <Textarea
                    id="req-body"
                    rows={6}
                    maxLength={3000}
                    value={firstBody}
                    onChange={(e) => setFirstBody(e.target.value)}
                    placeholder="Share enough context for someone to help you responsibly."
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground text-right">{firstBody.trim().length} / 3000</p>
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Starting…' : 'Start a Request'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {user && !loadingThreads && threads.filter((t) => !isChatThreadActive(t.status)).length > 0 && (
          <Card className="bg-white/85 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">Past requests</CardTitle>
              <CardDescription>Closed or archived threads for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {threads
                .filter((t) => !isChatThreadActive(t.status))
                .map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <span className="font-medium">{t.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {chatStatusLabel(t.status)} · {formatDate(t.closed_at ?? t.updated_at, 'MMM d, yyyy')}
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
      </div>
      </div>

      <ConfirmDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        title="Close this request?"
        description="You can start a new request after this one is closed."
        onConfirm={() => void confirmClose()}
        confirmLabel="Close request"
        variant="destructive"
      />
    </>
  )
}
