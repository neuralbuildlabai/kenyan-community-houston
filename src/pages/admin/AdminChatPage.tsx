import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquareText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { ChatMessage, ChatThread, Profile } from '@/lib/types'
import { chatCategoryLabel, chatStatusLabel } from '@/lib/chatRequests'
import { formatDate } from '@/lib/utils'

const STATUS_FILTER = ['all', 'open', 'pending_admin', 'pending_member', 'closed', 'archived'] as const
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export function AdminChatPage() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [profilesById, setProfilesById] = useState<Record<string, Pick<Profile, 'full_name' | 'email'>>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER)[number]>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [sending, setSending] = useState(false)

  const loadList = useCallback(async () => {
    setLoadingList(true)
    const { data, error } = await supabase.from('chat_threads').select('*').order('last_message_at', { ascending: false })
    setLoadingList(false)
    if (error) {
      toast.error('Could not load community requests.')
      setThreads([])
      return
    }
    const rows = (data as ChatThread[]) ?? []
    setThreads(rows)
    const ids = [...new Set(rows.map((r) => r.user_id))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
      const map: Record<string, Pick<Profile, 'full_name' | 'email'>> = {}
      for (const p of (profs as Profile[]) ?? []) {
        map[p.id] = { full_name: p.full_name, email: p.email }
      }
      setProfilesById(map)
    } else {
      setProfilesById({})
    }
  }, [])

  const loadThread = useCallback(async (id: string) => {
    setLoadingThread(true)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, thread_id, sender_id, sender_role, body, is_internal_note, created_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
    setLoadingThread(false)
    if (error) {
      toast.error('Could not load messages.')
      setMessages([])
      return
    }
    setMessages((data as ChatMessage[]) ?? [])
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedId) void loadThread(selectedId)
    else setMessages([])
  }, [selectedId, loadThread])

  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false
      return true
    })
  }, [threads, statusFilter, categoryFilter, search])

  const selected = threads.find((t) => t.id === selectedId) ?? null

  async function sendAdminReply(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || !selectedId) return
    const body = replyBody.trim()
    if (body.length < 1 || body.length > 3000) {
      toast.error('Message must be between 1 and 3,000 characters.')
      return
    }
    setSending(true)
    const { error } = await supabase.from('chat_messages').insert({
      thread_id: selectedId,
      sender_id: user.id,
      sender_role: 'admin',
      body,
      is_internal_note: internalNote,
    })
    setSending(false)
    if (error) {
      toast.error('Could not send message.')
      return
    }
    toast.success(internalNote ? 'Internal note saved.' : 'Reply sent.')
    setReplyBody('')
    setInternalNote(false)
    void loadThread(selectedId)
    void loadList()
  }

  async function patchThread(patch: Partial<ChatThread>) {
    if (!selectedId) return
    const { error } = await supabase.from('chat_threads').update(patch).eq('id', selectedId)
    if (error) {
      toast.error('Could not update request.')
      return
    }
    toast.success('Request updated.')
    void loadList()
    if (selectedId) void loadThread(selectedId)
  }

  function displayName(uid: string): string {
    const p = profilesById[uid]
    if (p?.full_name?.trim()) return p.full_name.trim()
    if (p?.email) return p.email
    return 'Member'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareText className="h-7 w-7 text-primary" />
            Community Requests
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Review and respond to member help requests.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => void loadList()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inbox</CardTitle>
            <CardDescription>Filters apply to this list only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search title…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as (typeof STATUS_FILTER)[number])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === 'all' ? 'All' : chatStatusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="business_services">Business & Services</SelectItem>
                    <SelectItem value="volunteering">Volunteering</SelectItem>
                    <SelectItem value="community_support">Community Support</SelectItem>
                    <SelectItem value="new_to_houston">New to Houston</SelectItem>
                    <SelectItem value="technical_support">Technical Support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="max-h-[480px] overflow-y-auto space-y-1 pr-1">
              {loadingList ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : filteredThreads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">No requests match.</p>
              ) : (
                filteredThreads.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      selectedId === t.id ? 'border-primary bg-primary/[0.06]' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="font-medium line-clamp-2">{t.title}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {chatStatusLabel(t.status)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {chatCategoryLabel(t.category)}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {displayName(t.user_id)} · {formatDate(t.last_message_at, 'MMM d, h:mm a')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Thread</CardTitle>
            <CardDescription>Select a request to view and reply.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-lg">Choose a request from the list.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">{selected.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Member: {displayName(selected.user_id)} · Started {formatDate(selected.created_at, 'MMM d, yyyy')}
                  </p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Workflow status</Label>
                      <Select value={selected.status} onValueChange={(v) => void patchThread({ status: v })}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="pending_admin">Awaiting team</SelectItem>
                          <SelectItem value="pending_member">Awaiting member</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Priority</Label>
                      <Select value={selected.priority} onValueChange={(v) => void patchThread({ priority: v })}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border rounded-xl divide-y max-h-[320px] overflow-y-auto bg-muted/10">
                  {loadingThread ? (
                    <p className="p-4 text-sm text-muted-foreground">Loading messages…</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={`p-3 text-sm ${m.is_internal_note ? 'bg-amber-500/[0.07]' : ''}`}>
                        <div className="flex justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          <span>
                            {m.sender_role === 'admin' ? 'Team' : 'Member'}
                            {m.is_internal_note ? ' · internal' : ''}
                          </span>
                          <span>{formatDate(m.created_at, 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={(ev) => void sendAdminReply(ev)} className="space-y-3 border-t pt-4">
                  <Label htmlFor="admin-reply">Reply</Label>
                  <Textarea
                    id="admin-reply"
                    rows={4}
                    maxLength={3000}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    disabled={sending}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={internalNote}
                      onChange={(e) => setInternalNote(e.target.checked)}
                      className="rounded border-input"
                    />
                    Internal note (member will not see)
                  </label>
                  <Button type="submit" disabled={sending || !replyBody.trim()}>
                    {sending ? 'Sending…' : internalNote ? 'Save note' : 'Send reply'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
