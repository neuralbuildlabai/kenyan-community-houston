import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleSlash,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ConfirmDialog'

import {
  createPoll,
  deletePoll,
  fetchAllPollsForAdmin,
  fetchPollResults,
  setPollFeatured,
  suggestPollSlug,
  updatePoll,
  type PollResultRow,
  type PollWithOptions,
} from '@/lib/pollsApi'

type DraftPoll = {
  question: string
  slug: string
  description: string
  optionsText: string // one option per line in the textarea
  closes_at: string // datetime-local input value or ''
  is_active: boolean
  is_featured: boolean
}

function emptyDraft(): DraftPoll {
  return {
    question: '',
    slug: '',
    description: '',
    optionsText: '',
    closes_at: '',
    is_active: true,
    is_featured: false,
  }
}

function pollToDraft(p: PollWithOptions): DraftPoll {
  return {
    question: p.question,
    slug: p.slug,
    description: p.description ?? '',
    optionsText: p.options.map((o) => o.label).join('\n'),
    closes_at: p.closes_at ? toLocalDatetimeInput(p.closes_at) : '',
    is_active: p.is_active,
    is_featured: p.is_featured,
  }
}

/** ISO → "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "YYYY-MM-DDTHH:mm" → ISO. */
function fromLocalDatetimeInput(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function parseOptions(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

export function AdminPollsPage() {
  const [polls, setPolls] = useState<PollWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPoll>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [resultsByPoll, setResultsByPoll] = useState<Record<string, PollResultRow[]>>({})

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const all = await fetchAllPollsForAdmin()
      setPolls(all)
      // Best-effort fetch results for each poll in parallel; admin RPC
      // never throws "not allowed" because the admin path is whitelisted.
      const entries = await Promise.all(
        all.map(async (p) => {
          try {
            const rows = await fetchPollResults(p.id)
            return [p.id, rows] as const
          } catch {
            return [p.id, [] as PollResultRow[]] as const
          }
        }),
      )
      setResultsByPoll(Object.fromEntries(entries))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load polls')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft())
    setEditorOpen(true)
  }

  function openEdit(p: PollWithOptions) {
    setEditingId(p.id)
    setDraft(pollToDraft(p))
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  async function handleSave() {
    if (!draft.question.trim()) {
      toast.error('Add a question')
      return
    }
    const slug = (draft.slug || suggestPollSlug(draft.question)).trim()
    if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) {
      toast.error('Slug must be lowercase letters, numbers, and dashes')
      return
    }
    const options = parseOptions(draft.optionsText)

    if (!editingId) {
      // Creating: need at least 2 options.
      if (options.length < 2) {
        toast.error('Add at least 2 options (one per line)')
        return
      }
    }

    setSaving(true)
    try {
      if (editingId) {
        await updatePoll({
          id: editingId,
          question: draft.question.trim(),
          description: draft.description.trim() || null,
          closes_at: fromLocalDatetimeInput(draft.closes_at),
          is_active: draft.is_active,
        })
        // If admin toggled featured here, route through the helper so the
        // "only one featured" rule holds.
        const original = polls.find((p) => p.id === editingId)
        if (original && original.is_featured !== draft.is_featured) {
          await setPollFeatured(editingId, draft.is_featured)
        }
        toast.success('Poll updated')
      } else {
        const created = await createPoll({
          slug,
          question: draft.question.trim(),
          description: draft.description.trim() || null,
          options: options.map((label) => ({ label })),
          closes_at: fromLocalDatetimeInput(draft.closes_at),
          is_active: draft.is_active,
          is_featured: false, // start unfeatured; admin toggles after if desired
        })
        if (draft.is_featured) {
          await setPollFeatured(created.id, true)
        }
        toast.success('Poll created')
      }
      closeEditor()
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save poll')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleFeatured(p: PollWithOptions) {
    try {
      await setPollFeatured(p.id, !p.is_featured)
      toast.success(p.is_featured ? 'Removed from landing page' : 'Now featured on landing page')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update featured state')
    }
  }

  async function handleToggleActive(p: PollWithOptions) {
    try {
      await updatePoll({ id: p.id, is_active: !p.is_active })
      toast.success(p.is_active ? 'Poll deactivated' : 'Poll reactivated')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update poll')
    }
  }

  async function handleConfirmDelete() {
    if (!deleteId) return
    try {
      await deletePoll(deleteId)
      toast.success('Poll deleted')
      setDeleteId(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete poll')
    }
  }

  const activePolls = useMemo(() => polls.filter((p) => p.is_active), [polls])
  const inactivePolls = useMemo(() => polls.filter((p) => !p.is_active), [polls])

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Polls</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask the community a question. Toggle <strong>Featured</strong> to show one
            poll on the public landing page. Only one poll can be featured at a time.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="admin-poll-create">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          New poll
        </Button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading polls…</p>
      ) : polls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No polls yet. Create one to start gathering community input.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <PollSection
            title="Active"
            polls={activePolls}
            resultsByPoll={resultsByPoll}
            onEdit={openEdit}
            onToggleFeatured={handleToggleFeatured}
            onToggleActive={handleToggleActive}
            onDelete={(id) => setDeleteId(id)}
          />
          {inactivePolls.length > 0 ? (
            <PollSection
              title="Inactive"
              polls={inactivePolls}
              resultsByPoll={resultsByPoll}
              onEdit={openEdit}
              onToggleFeatured={handleToggleFeatured}
              onToggleActive={handleToggleActive}
              onDelete={(id) => setDeleteId(id)}
            />
          ) : null}
        </div>
      )}

      {editorOpen ? (
        <PollEditor
          editingId={editingId}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          onClose={closeEditor}
          onSave={() => void handleSave()}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete poll?"
        description="This permanently removes the poll, its options, and every vote. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  )
}

// ─── Section list ─────────────────────────────────────────

function PollSection({
  title,
  polls,
  resultsByPoll,
  onEdit,
  onToggleFeatured,
  onToggleActive,
  onDelete,
}: {
  title: string
  polls: PollWithOptions[]
  resultsByPoll: Record<string, PollResultRow[]>
  onEdit: (p: PollWithOptions) => void
  onToggleFeatured: (p: PollWithOptions) => void
  onToggleActive: (p: PollWithOptions) => void
  onDelete: (id: string) => void
}) {
  if (polls.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <ul className="space-y-3">
        {polls.map((p) => (
          <li key={p.id}>
            <PollCard
              poll={p}
              results={resultsByPoll[p.id] ?? []}
              onEdit={() => onEdit(p)}
              onToggleFeatured={() => onToggleFeatured(p)}
              onToggleActive={() => onToggleActive(p)}
              onDelete={() => onDelete(p.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function PollCard({
  poll,
  results,
  onEdit,
  onToggleFeatured,
  onToggleActive,
  onDelete,
}: {
  poll: PollWithOptions
  results: PollResultRow[]
  onEdit: () => void
  onToggleFeatured: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const totalVotes = results.reduce((sum, r) => sum + r.vote_count, 0)
  const closedAt = poll.closes_at ? new Date(poll.closes_at) : null
  const pollClosed = closedAt !== null && closedAt.getTime() <= Date.now()

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{poll.question}</h3>
            {poll.is_featured ? (
              <Badge variant="default" className="gap-1">
                <Pin className="h-3 w-3" aria-hidden />
                Featured
              </Badge>
            ) : null}
            {!poll.is_active ? <Badge variant="secondary">Inactive</Badge> : null}
            {pollClosed ? <Badge variant="outline">Closed</Badge> : null}
          </div>
          {poll.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            /{poll.slug} · {totalVotes} vote{totalVotes === 1 ? '' : 's'}
            {closedAt ? ` · closes ${closedAt.toLocaleString()}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={poll.is_featured ? 'secondary' : 'outline'}
            onClick={onToggleFeatured}
            data-testid="admin-poll-feature"
          >
            {poll.is_featured ? (
              <>
                <PinOff className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Unfeature
              </>
            ) : (
              <>
                <Pin className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Feature
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={onToggleActive}>
            {poll.is_active ? (
              <>
                <CircleSlash className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Reactivate
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Inline results */}
      <ul className="mt-4 space-y-2">
        {poll.options.map((o) => {
          const r = results.find((x) => x.option_id === o.id)
          const count = r?.vote_count ?? 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          return (
            <li key={o.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{o.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary/60 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Editor modal ─────────────────────────────────────────

function PollEditor({
  editingId,
  draft,
  setDraft,
  saving,
  onClose,
  onSave,
}: {
  editingId: string | null
  draft: DraftPoll
  setDraft: (d: DraftPoll) => void
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const isEditing = !!editingId

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit poll' : 'New poll'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="poll-question">Question</Label>
            <Input
              id="poll-question"
              value={draft.question}
              maxLength={240}
              placeholder="What community event should we plan next?"
              onChange={(e) => {
                const q = e.target.value
                setDraft({
                  ...draft,
                  question: q,
                  // Auto-slug only while creating, only if user hasn't typed one.
                  slug: !isEditing && !draft.slug ? suggestPollSlug(q) : draft.slug,
                })
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-slug">
              Slug <span className="text-xs text-muted-foreground">(URL-friendly id)</span>
            </Label>
            <Input
              id="poll-slug"
              value={draft.slug}
              maxLength={80}
              placeholder="community-event-poll"
              disabled={isEditing}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
            {isEditing ? (
              <p className="text-xs text-muted-foreground">Slug is locked after creation.</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-description">Description (optional)</Label>
            <Textarea
              id="poll-description"
              value={draft.description}
              maxLength={1000}
              rows={3}
              placeholder="A sentence or two of context. Markdown is not rendered."
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-options">Options (one per line)</Label>
            <Textarea
              id="poll-options"
              value={draft.optionsText}
              rows={5}
              disabled={isEditing}
              placeholder={'Saturday picnic\nFriday evening mixer\nSunday brunch'}
              onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
            />
            {isEditing ? (
              <p className="text-xs text-muted-foreground">
                Options can&apos;t be edited after creation because existing votes are
                tied to them. To change options, delete this poll and create a new one.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">At least 2 required.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-closes">Closes at (optional)</Label>
            <Input
              id="poll-closes"
              type="datetime-local"
              value={draft.closes_at}
              onChange={(e) => setDraft({ ...draft, closes_at: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              When set, votes are blocked after this moment and results become visible
              to everyone (including non-voters).
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Active (visible to community)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.is_featured}
                onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Featured on landing page
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} data-testid="admin-poll-save">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : isEditing ? (
              'Save changes'
            ) : (
              'Create poll'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
