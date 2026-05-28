import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, Search, XCircle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type {
  VendorCategory,
  VendorPaymentStatus,
  VendorSignupStatus,
} from '@/lib/types'
import {
  VENDOR_PAYMENT_STATUSES,
  VENDOR_SIGNUP_STATUSES,
  formatVendorFee,
  vendorCategoryLabel,
  vendorPaymentStatusLabel,
  vendorSignupStatusLabel,
} from '@/lib/eventVendorSignup'
import { formatDateShort } from '@/lib/utils'

/**
 * Admin → Vendors. Private list of every vendor signup across
 * every event. Mirrors AdminVolunteersPage in layout so admins
 * have one mental model for both flows.
 *
 * Key differences vs. Volunteers:
 * - Each row shows a fee (USD) and an independent payment_status
 *   the treasurer flips when CashApp/Venmo/PayPal funds arrive.
 * - "Mark paid" is a single button that flips payment_status to
 *   paid AND status to confirmed in one round-trip — that's the
 *   "complete automation" move the owner asked for: one click to
 *   resolve the happy path.
 * - Filterable by reference_code so a payment note like
 *   "VND-A1B2C3" can be resolved in one keystroke.
 */
type SignupRow = {
  id: string
  event_id: string
  business_name: string
  contact_name: string
  email: string
  phone: string
  vendor_category: VendorCategory
  product_description: string | null
  fee_amount_cents: number
  payment_status: VendorPaymentStatus
  status: VendorSignupStatus
  reference_code: string
  submitted_at: string
  events: { title: string; slug: string } | null
}

const VENDOR_CATEGORY_OPTIONS: VendorCategory[] = ['food', 'other']

export function AdminVendorsPage() {
  const [rows, setRows] = useState<SignupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('event_vendor_signups')
      .select(
        'id, event_id, business_name, contact_name, email, phone, vendor_category, product_description, fee_amount_cents, payment_status, status, reference_code, submitted_at, events(title, slug)'
      )
      .order('submitted_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      setRows([])
    } else {
      const list = Array.isArray(data) ? data : []
      const normalized: SignupRow[] = list.map((r: Record<string, unknown>) => {
        const ev = r.events as
          | { title?: string; slug?: string }
          | { title?: string; slug?: string }[]
          | null
          | undefined
        const one = Array.isArray(ev) ? ev[0] : ev
        return {
          id: r.id as string,
          event_id: r.event_id as string,
          business_name: r.business_name as string,
          contact_name: r.contact_name as string,
          email: r.email as string,
          phone: r.phone as string,
          vendor_category: r.vendor_category as VendorCategory,
          product_description: (r.product_description as string | null) ?? null,
          fee_amount_cents: r.fee_amount_cents as number,
          payment_status: r.payment_status as VendorPaymentStatus,
          status: r.status as VendorSignupStatus,
          reference_code: (r.reference_code as string) ?? '',
          submitted_at: r.submitted_at as string,
          events: one?.title ? { title: one.title, slug: one.slug ?? '' } : null,
        }
      })
      setRows(normalized)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      const t = r.events?.title
      if (t) map.set(r.event_id, t)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (eventFilter !== 'all' && r.event_id !== eventFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (paymentFilter !== 'all' && r.payment_status !== paymentFilter) return false
      if (categoryFilter !== 'all' && r.vendor_category !== categoryFilter) return false
      if (q) {
        const hay = [
          r.business_name,
          r.contact_name,
          r.phone,
          r.email,
          r.reference_code,
          r.product_description ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, eventFilter, statusFilter, paymentFilter, categoryFilter, search])

  const totals = useMemo(() => {
    const unpaidCents = filtered
      .filter((r) => r.payment_status === 'unpaid')
      .reduce((sum, r) => sum + r.fee_amount_cents, 0)
    const paidCents = filtered
      .filter((r) => r.payment_status === 'paid')
      .reduce((sum, r) => sum + r.fee_amount_cents, 0)
    return { unpaidCents, paidCents }
  }, [filtered])

  async function updateStatus(id: string, status: VendorSignupStatus) {
    setUpdatingId(id)
    const { error } = await supabase
      .from('event_vendor_signups')
      .update({ status })
      .eq('id', id)
    setUpdatingId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Status updated')
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  async function updatePaymentStatus(id: string, payment_status: VendorPaymentStatus) {
    setUpdatingId(id)
    const { error } = await supabase
      .from('event_vendor_signups')
      .update({ payment_status })
      .eq('id', id)
    setUpdatingId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Payment status updated')
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, payment_status } : r))
    )
  }

  /**
   * One-click "mark paid": flips payment_status to paid AND
   * status to confirmed in a single round-trip. Matches the
   * "complete automation" goal — treasurer sees money arrive,
   * clicks once, vendor is fully confirmed.
   */
  async function markPaidAndConfirm(id: string) {
    setUpdatingId(id)
    const { error } = await supabase
      .from('event_vendor_signups')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('id', id)
    setUpdatingId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Marked paid & confirmed')
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, payment_status: 'paid' as const, status: 'confirmed' as const }
          : r
      )
    )
  }

  /**
   * Soft-cancel: flips status to 'cancelled' so the row is hidden
   * from the public vendor list but preserved for treasurer
   * reconciliation. Reversible by changing the status dropdown.
   */
  async function cancelSignup(id: string, businessName: string) {
    if (
      !window.confirm(
        `Cancel "${businessName}"? They will be removed from the public vendor list. You can reverse this from the status dropdown.`
      )
    ) {
      return
    }
    setUpdatingId(id)
    const { error } = await supabase
      .from('event_vendor_signups')
      .update({ status: 'cancelled' })
      .eq('id', id)
    setUpdatingId(null)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Vendor cancelled')
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'cancelled' as const } : r
      )
    )
  }

  function copyReference(code: string) {
    if (!code) return
    try {
      void navigator.clipboard?.writeText(code)
      toast.success(`Copied ${code}`)
    } catch {
      // Soft failure — code is also visible inline.
    }
  }

  return (
    <>
      <SEOHead title="Vendors" noIndex />
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Event vendors</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Private signups across published events. Mark a vendor paid as soon as the
              treasurer confirms CashApp / Venmo / PayPal funds arrived — the row
              auto-confirms in one click.
            </p>
          </div>
          {filtered.length > 0 ? (
            <div className="rounded-lg border bg-card px-4 py-3 text-sm">
              <div>
                <span className="text-muted-foreground">Unpaid: </span>
                <span className="font-semibold text-foreground">
                  {formatVendorFee(totals.unpaidCents)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-semibold text-foreground">
                  {formatVendorFee(totals.paidCents)}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search business, contact, phone, email, or VND-…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid min-w-0 flex-1 max-w-3xl gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="form-field-stack">
              <Label className="text-xs">Event</Label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {eventOptions.map(([id, title]) => (
                    <SelectItem key={id} value={id}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack">
              <Label className="text-xs">Payment</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All payment states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment states</SelectItem>
                  {VENDOR_PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {vendorPaymentStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {VENDOR_SIGNUP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {vendorSignupStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="form-field-stack">
              <Label className="text-xs">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {VENDOR_CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {vendorCategoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Business</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead className="whitespace-nowrap">Fee</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Contact info</TableHead>
                <TableHead className="whitespace-nowrap">Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={11}>
                      <div className="h-8 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-14 text-center text-muted-foreground"
                  >
                    {rows.length === 0
                      ? 'No vendor signups yet. Enable vendor signup on an event and share the link from the event page.'
                      : 'No rows match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const isUpdating = updatingId === r.id
                  const slug = r.events?.slug ?? ''
                  const isCancelled = r.status === 'cancelled' || r.status === 'declined'
                  return (
                    <TableRow key={r.id} className={isCancelled ? 'opacity-60' : ''}>
                      <TableCell className="max-w-[180px] font-medium">
                        <div className="truncate" title={r.events?.title ?? ''}>
                          {r.events?.title ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate font-medium" title={r.business_name}>
                          {r.business_name}
                        </div>
                        {r.product_description ? (
                          <div
                            className="truncate text-xs text-muted-foreground"
                            title={r.product_description}
                          >
                            {r.product_description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden max-w-[150px] truncate md:table-cell">
                        {r.contact_name}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => copyReference(r.reference_code)}
                          className="font-mono text-xs font-semibold text-foreground underline decoration-dotted decoration-muted-foreground underline-offset-4 hover:decoration-primary"
                          title="Click to copy"
                        >
                          {r.reference_code || '—'}
                        </button>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {vendorCategoryLabel(r.vendor_category)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold">
                        {formatVendorFee(r.fee_amount_cents)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.payment_status}
                          disabled={isUpdating}
                          onValueChange={(v) =>
                            void updatePaymentStatus(r.id, v as VendorPaymentStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VENDOR_PAYMENT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {vendorPaymentStatusLabel(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          disabled={isUpdating}
                          onValueChange={(v) =>
                            void updateStatus(r.id, v as VendorSignupStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VENDOR_SIGNUP_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {vendorSignupStatusLabel(s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-[220px]">
                        <div className="truncate text-xs" title={r.email}>
                          {r.email}
                        </div>
                        <div className="truncate font-mono text-xs text-muted-foreground" title={r.phone}>
                          {r.phone}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateShort(r.submitted_at.slice(0, 10))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isCancelled &&
                          (r.payment_status !== 'paid' || r.status !== 'confirmed') ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="h-8 gap-1"
                              disabled={isUpdating}
                              onClick={() => void markPaidAndConfirm(r.id)}
                              data-testid="admin-vendor-mark-paid"
                              title="Mark paid & confirm in one click"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                            </Button>
                          ) : null}
                          {!isCancelled ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={isUpdating}
                              onClick={() => void cancelSignup(r.id, r.business_name)}
                              data-testid="admin-vendor-cancel"
                              title="Cancel this vendor (removes from public list, reversible)"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Cancel
                            </Button>
                          ) : null}
                          {slug ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                              title="Public event"
                            >
                              <a
                                href={`/events/${slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
