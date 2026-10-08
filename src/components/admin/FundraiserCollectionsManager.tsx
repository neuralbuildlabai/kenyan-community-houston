import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDateShort } from '@/lib/utils'
import {
  COLLECTION_ENTRY_TYPES,
  collectionDraftFromRow,
  emptyCollectionDraft,
  entryTypeLabel,
  formatCents,
  formatPercent,
  previewCollectedCents,
  summarizeFundraiserCollections,
  toCents,
  validateCollectionDraft,
  type AdminCollectionRow,
  type CollectionDraft,
} from '@/lib/fundraiserCollections'
import {
  createCollection,
  deleteCollection,
  fetchAdminCollections,
  updateCollection,
} from '@/lib/fundraiserCollectionsApi'
import { toast } from 'sonner'

/**
 * Where admins tally confirmed money for one fundraiser.
 *
 * This ledger is the only place a total is entered. There is no "raised
 * amount" field to edit alongside it, so a wrong figure is corrected by
 * fixing or removing the record that caused it — which keeps the public
 * table, the total, the bar and the goal status telling the same story.
 *
 * The form shows what the total becomes before anything is saved, because
 * these numbers go straight onto a public page and "add it and see" is a
 * bad way to find out you typed 20000 instead of 2000.
 */
export function FundraiserCollectionsManager({
  fundraiserId,
  fundraiserTitle,
  goalAmount,
  open,
  onOpenChange,
  onSaved,
}: {
  fundraiserId: string
  fundraiserTitle: string
  goalAmount: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Lets the parent table pick up the recalculated `raised_amount`. */
  onSaved?: () => void
}) {
  const [rows, setRows] = useState<AdminCollectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CollectionDraft>(() => emptyCollectionDraft())
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchAdminCollections(fundraiserId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load collections')
      setRows([])
    }
    setLoading(false)
  }, [fundraiserId])

  useEffect(() => {
    if (!open) return
    setEditingId(null)
    setDraft(emptyCollectionDraft())
    void load()
  }, [open, load])

  const summary = summarizeFundraiserCollections(rows, goalAmount)
  const previewCents = previewCollectedCents(rows, draft, editingId)
  const previewPercent =
    summary.goalCents && summary.goalCents > 0 ? (previewCents / summary.goalCents) * 100 : null
  const draftChangesTotal = toCents(draft.amount) > 0

  function startEdit(row: AdminCollectionRow) {
    setEditingId(row.id)
    setDraft(collectionDraftFromRow(row))
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(emptyCollectionDraft())
  }

  async function save() {
    const problem = validateCollectionDraft(draft)
    if (problem) {
      toast.error(problem)
      return
    }
    setSaving(true)
    try {
      if (editingId) await updateCollection(editingId, fundraiserId, draft)
      else await createCollection(fundraiserId, draft)
      toast.success(editingId ? 'Collection updated' : 'Collection added')
      cancelEdit()
      await load()
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the collection')
    }
    setSaving(false)
  }

  async function remove() {
    if (!deleteId) return
    try {
      await deleteCollection(deleteId)
      toast.success('Collection removed')
      if (editingId === deleteId) cancelEdit()
      await load()
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the collection')
    }
    setDeleteId(null)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
          data-testid="fundraiser-collections-manager"
        >
          <DialogHeader>
            <DialogTitle>Collections — {fundraiserTitle}</DialogTitle>
            <DialogDescription>
              Confirmed funds received. Everything the public page shows — collected amount,
              progress, remaining balance and goal status — is calculated from these records.
              Do not record pledges or payments you have not confirmed.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span>
                <span className="text-muted-foreground">Collected: </span>
                <span className="font-semibold" data-testid="admin-collections-total">
                  {formatCents(summary.collectedCents)}
                </span>
              </span>
              {summary.goalCents ? (
                <span className="text-muted-foreground">
                  of {formatCents(summary.goalCents)} goal ·{' '}
                  {formatPercent(summary.percentRaised ?? 0)}
                  {summary.goalReached ? ' · Goal reached' : ''}
                </span>
              ) : (
                <span className="text-muted-foreground">No goal set</span>
              )}
            </div>
            {draftChangesTotal ? (
              <p className="mt-1.5 text-xs text-primary" data-testid="admin-collections-preview">
                After saving: {formatCents(previewCents)}
                {previewPercent === null ? '' : ` · ${formatPercent(previewPercent)} of goal`}
              </p>
            ) : null}
          </div>

          {/* ── Add / edit form ── */}
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-semibold">
              {editingId ? 'Edit collection' : 'Add a collection'}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="collection-received-on">Date received</Label>
                <Input
                  id="collection-received-on"
                  type="date"
                  value={draft.received_on}
                  onChange={(e) => setDraft({ ...draft, received_on: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="collection-amount">Amount (USD)</Label>
                <Input
                  id="collection-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="250.00"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="collection-description">Source / description (public)</Label>
                <Input
                  id="collection-description"
                  value={draft.description}
                  placeholder="Cash App collections"
                  maxLength={160}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="collection-entry-type">Record type</Label>
                <Select
                  value={draft.entry_type}
                  onValueChange={(v) =>
                    setDraft({ ...draft, entry_type: v as CollectionDraft['entry_type'] })
                  }
                >
                  <SelectTrigger id="collection-entry-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLECTION_ENTRY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {entryTypeLabel(t)}
                        {t === 'batch' ? ' (group of confirmed receipts)' : ' donation'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="collection-donor">Donor name (optional)</Label>
                <Input
                  id="collection-donor"
                  value={draft.donor_name}
                  maxLength={120}
                  onChange={(e) => setDraft({ ...draft, donor_name: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="collection-show-donor"
                    className="mt-0.5"
                    checked={draft.show_donor_name}
                    onCheckedChange={(v) => setDraft({ ...draft, show_donor_name: v === true })}
                  />
                  <Label
                    htmlFor="collection-show-donor"
                    className="cursor-pointer text-sm font-normal leading-snug"
                  >
                    Show this donor&apos;s name on the public page.{' '}
                    <span className="text-muted-foreground">
                      Donors stay anonymous unless you tick this.
                    </span>
                  </Label>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="collection-private-note">
                  Private reconciliation note (never public)
                </Label>
                <Textarea
                  id="collection-private-note"
                  rows={2}
                  maxLength={500}
                  value={draft.private_note}
                  placeholder="Transaction reference, deposit batch, who to follow up with…"
                  onChange={(e) => setDraft({ ...draft, private_note: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={saving}
                onClick={() => void save()}
                data-testid="admin-collection-save"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {editingId ? 'Save changes' : 'Add collection'}
              </Button>
              {editingId ? (
                <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          {/* ── Existing records ── */}
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[34rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source / description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Running total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="h-8 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ) : summary.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No collections recorded. The public page shows $0 collected.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.rows.map((row) => {
                    const admin = rows.find((r) => r.id === row.id)
                    return (
                      <TableRow key={row.id} data-testid="admin-collection-row">
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateShort(row.received_on)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">{row.description}</span>
                          <span className="block text-xs text-muted-foreground">
                            {entryTypeLabel(row.entry_type)}
                            {admin?.show_donor_name && admin.donor_name
                              ? ` · ${admin.donor_name} (shown publicly)`
                              : ' · anonymous'}
                          </span>
                          {admin?.private_note ? (
                            <span className="mt-0.5 block text-xs italic text-muted-foreground">
                              Private: {admin.private_note}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                          {formatCents(row.amountCents)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-muted-foreground">
                          {formatCents(row.runningTotalCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              aria-label={`Edit collection from ${formatDateShort(row.received_on)}`}
                              onClick={() => admin && startEdit(admin)}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label={`Remove collection from ${formatDateShort(row.received_on)}`}
                              onClick={() => setDeleteId(row.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove collection record"
        description="The public total, progress bar and collections table will be recalculated without it."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => void remove()}
      />
    </>
  )
}
