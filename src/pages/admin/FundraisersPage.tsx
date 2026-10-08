import { useEffect, useState } from 'react'
import { Check, Coins, Copy, ExternalLink, Eye, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FundraiserCollectionsManager } from '@/components/admin/FundraiserCollectionsManager'
import { supabase } from '@/lib/supabase'
import { moderationStatusPatch } from '@/lib/publishLifecycle'
import {
  FUNDRAISER_FUNDING_MODES,
  fundraiserFundingModeLabel,
  fundraiserFundingModePatch,
  normalizeFundraiserFundingMode,
} from '@/lib/fundraiserFunding'
import { fundraiserPath, fundraiserPublicUrl } from '@/lib/fundraiserShare'
import { formatCents, formatPercent, toCents } from '@/lib/fundraiserCollections'
import { toast } from 'sonner'

interface Fundraiser {
  id: string
  title: string
  slug: string
  category: string
  status: string
  verification_status: string
  funding_mode: string | null
  goal_amount: number | null
  raised_amount: number
  donations_closed: boolean | null
  is_homepage_featured: boolean | null
  beneficiary_name: string
  created_at: string
}

const STATUS_OPTIONS = ['all', 'published', 'pending', 'draft', 'archived']
const VERIFICATION = ['unverified', 'under_review', 'verified', 'flagged']

const SELECT_COLUMNS =
  'id, title, slug, category, status, verification_status, funding_mode, goal_amount, raised_amount, donations_closed, is_homepage_featured, beneficiary_name, created_at'

/** Copy-to-clipboard for one row's public URL, with its own confirmation state. */
function CopyPublicLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = fundraiserPublicUrl(slug)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Public link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — open the page and copy the address')
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 gap-1 px-2 text-xs"
      onClick={() => void copy()}
      title={url}
      data-testid="admin-fundraiser-copy-link"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  )
}

export function AdminFundraisersPage() {
  const [items, setItems] = useState<Fundraiser[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [collectionsFor, setCollectionsFor] = useState<Fundraiser | null>(null)

  async function load() {
    setLoading(true)
    let q = supabase.from('fundraisers').select(SELECT_COLUMNS).order('created_at', { ascending: false })
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const { data } = await q
    setItems((data ?? []) as unknown as Fundraiser[])
    setLoading(false)
  }

  // Reload only when the status filter changes; `load` is a closure
  // recreated each render, so we keep it out of the dependency array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [statusFilter])

  async function updateStatus(id: string, status: string) {
    const { data, error } = await supabase
      .from('fundraisers')
      .update(moderationStatusPatch(status))
      .eq('id', id)
      .select('id')
    if (error) toast.error(error.message || 'Update failed')
    else if (!data?.length) toast.error('Could not update — no matching row (check permissions).')
    else {
      toast.success(
        status === 'published'
          ? 'Published — the public page is live'
          : `Fundraiser ${status}`
      )
      load()
    }
  }

  async function updateVerification(id: string, verification_status: string) {
    const { error } = await supabase.from('fundraisers').update({ verification_status }).eq('id', id)
    if (error) toast.error('Update failed')
    else { toast.success('Verification updated'); load() }
  }

  /**
   * Switching a row to internal clears the external link in the same patch —
   * `fundraisers_internal_no_donation_url_chk` (migration 083) rejects a row
   * that carries both.
   */
  async function updateFundingMode(id: string, mode: string) {
    const { error } = await supabase.from('fundraisers').update(fundraiserFundingModePatch(mode)).eq('id', id)
    if (error) toast.error(error.message || 'Update failed')
    else { toast.success('Donation source updated'); load() }
  }

  /**
   * Homepage featuring and whether donations are open are both independent
   * of publication status and of whether the goal has been reached — the
   * homepage query re-checks publication itself, and nothing closes
   * donations automatically when a target is hit.
   */
  async function updateFlag(id: string, patch: Partial<Fundraiser>, message: string) {
    const { error } = await supabase.from('fundraisers').update(patch).eq('id', id)
    if (error) toast.error(error.message || 'Update failed')
    else { toast.success(message); load() }
  }

  async function deleteItem() {
    if (!deleteId) return
    const { error } = await supabase.from('fundraisers').delete().eq('id', deleteId)
    if (error) toast.error('Delete failed')
    else { toast.success('Fundraiser deleted'); load() }
    setDeleteId(null)
  }

  const displayed = items.filter((f) => !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.beneficiary_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fundraisers</h1>
        <p className="text-muted-foreground text-sm">
          {items.length} total · collected totals come from each fundraiser&apos;s collection
          ledger, not from a figure typed here.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search fundraisers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table className="min-w-[60rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden lg:table-cell">Collected / goal</TableHead>
              <TableHead className="hidden md:table-cell">Donations</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Homepage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>
              ))
            ) : displayed.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No fundraisers found</TableCell></TableRow>
            ) : displayed.map((item) => {
              const published = item.status === 'published'
              const collectedCents = toCents(item.raised_amount)
              const goalCents = item.goal_amount === null ? null : toCents(item.goal_amount)
              return (
              <TableRow key={item.id}>
                <TableCell className="font-medium max-w-[200px]">
                  <span className="line-clamp-2">{item.title}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {item.beneficiary_name}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{formatCents(collectedCents)}</span>
                  {goalCents ? (
                    <>
                      {' '}of {formatCents(goalCents)}
                      <span className="block text-xs">
                        {formatPercent((collectedCents / goalCents) * 100)}
                        {collectedCents >= goalCents ? ' · Goal reached' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="block text-xs">No goal set</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Select
                    value={normalizeFundraiserFundingMode(item.funding_mode)}
                    onValueChange={(v) => updateFundingMode(item.id, v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUNDRAISER_FUNDING_MODES.map((m) => (
                        <SelectItem key={m} value={m}>{fundraiserFundingModeLabel(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Switch
                      id={`donations-open-${item.id}`}
                      checked={!item.donations_closed}
                      onCheckedChange={(open) =>
                        updateFlag(
                          item.id,
                          { donations_closed: !open },
                          open ? 'Donations open' : 'Donations closed'
                        )
                      }
                    />
                    <Label htmlFor={`donations-open-${item.id}`} className="text-[11px] font-normal text-muted-foreground">
                      {item.donations_closed ? 'Closed' : 'Open'}
                    </Label>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={item.verification_status} onValueChange={(v) => updateVerification(item.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{VERIFICATION.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{['draft', 'pending', 'published', 'archived'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id={`homepage-${item.id}`}
                      checked={Boolean(item.is_homepage_featured)}
                      disabled={!published && !item.is_homepage_featured}
                      data-testid="admin-fundraiser-feature-toggle"
                      onCheckedChange={(on) =>
                        updateFlag(
                          item.id,
                          { is_homepage_featured: on },
                          on ? 'Featured on the homepage' : 'Removed from the homepage'
                        )
                      }
                    />
                    <Label htmlFor={`homepage-${item.id}`} className="text-[11px] font-normal text-muted-foreground">
                      {published ? 'Feature' : 'Publish first'}
                    </Label>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => setCollectionsFor(item)}
                      data-testid="admin-fundraiser-collections"
                    >
                      <Coins className="h-3.5 w-3.5" aria-hidden /> Collections
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
                      <a href={fundraiserPath(item.slug)} target="_blank" rel="noopener noreferrer">
                        {published ? (
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {published ? 'Public page' : 'Preview'}
                      </a>
                    </Button>
                    {published ? <CopyPublicLinkButton slug={item.slug} /> : null}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>

      {collectionsFor ? (
        <FundraiserCollectionsManager
          key={collectionsFor.id}
          fundraiserId={collectionsFor.id}
          fundraiserTitle={collectionsFor.title}
          goalAmount={collectionsFor.goal_amount}
          open
          onOpenChange={(o) => !o && setCollectionsFor(null)}
          onSaved={load}
        />
      ) : null}

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Fundraiser" description="This action cannot be undone." onConfirm={deleteItem} />
    </div>
  )
}
