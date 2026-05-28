import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Mail, Phone, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { formatDateShort } from '@/lib/utils'

/**
 * Admin → Vendor directory. Deduplicated roster of every business
 * that has EVER signed up for a vendor slot across any event. The
 * primary AdminVendorsPage tracks per-event-per-vendor signups
 * (with fee/payment/status state). This page is the "people-first"
 * view: one row per unique business, latest contact info, and the
 * list of events they've been at — so when a new event crops up
 * the team can fire off a quick invite to past vendors.
 *
 * Dedup key:
 *   Lowercased email when present; falls back to lowercased
 *   business_name + phone if email is missing. Email is the
 *   canonical primary key for inviting.
 *
 * Read source:
 *   event_vendor_signups table directly (admin RLS allows full
 *   read). No new RPC needed — we aggregate client-side because
 *   the table is small (<1000 rows for years).
 */
type DirectoryRow = {
  business_name: string
  contact_name: string
  email: string
  phone: string
  category: string  // most-recent category they used
  event_count: number
  last_event_title: string
  last_signup_at: string
}

type Signup = {
  business_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  vendor_category: string | null
  submitted_at: string
  events: { title?: string | null } | { title?: string | null }[] | null
}

function dedupSignups(rows: Signup[]): DirectoryRow[] {
  const byKey = new Map<string, DirectoryRow>()
  for (const r of rows) {
    const email = (r.email ?? '').trim().toLowerCase()
    const business = (r.business_name ?? '').trim()
    const phone = (r.phone ?? '').trim()
    const key = email || `${business.toLowerCase()}|${phone}`
    if (!key) continue

    const ev = Array.isArray(r.events) ? r.events[0] : r.events
    const eventTitle = ev?.title ?? '—'

    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        business_name: business,
        contact_name: (r.contact_name ?? '').trim(),
        email,
        phone,
        category: (r.vendor_category ?? '').trim(),
        event_count: 1,
        last_event_title: eventTitle,
        last_signup_at: r.submitted_at,
      })
    } else {
      existing.event_count += 1
      // Keep the most recent submission's contact info as canonical.
      if (r.submitted_at > existing.last_signup_at) {
        existing.last_signup_at = r.submitted_at
        existing.last_event_title = eventTitle
        existing.contact_name = (r.contact_name ?? existing.contact_name).trim()
        existing.phone = phone || existing.phone
        existing.category = (r.vendor_category ?? existing.category).trim()
      }
    }
  }
  return [...byKey.values()].sort(
    (a, b) => (b.last_signup_at > a.last_signup_at ? 1 : -1)
  )
}

export function AdminVendorDirectoryPage() {
  const [rows, setRows] = useState<DirectoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('event_vendor_signups')
      .select(
        'business_name, contact_name, email, phone, vendor_category, submitted_at, events(title)'
      )
      .order('submitted_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      setRows([])
    } else {
      setRows(dedupSignups((data as Signup[]) ?? []))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.business_name, r.contact_name, r.email, r.phone, r.last_event_title]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [rows, search])

  function copyText(text: string, label: string) {
    if (!text) return
    try {
      void navigator.clipboard?.writeText(text)
      toast.success(`Copied ${label}`)
    } catch {
      toast.error('Copy failed — select and copy manually')
    }
  }

  return (
    <>
      <SEOHead title="Vendor directory" noIndex />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Vendor directory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every business that has ever signed up as a vendor, deduplicated by
            email. Use this list to invite past vendors when a new event drops.
            For per-event status, fees, and payment tracking see{' '}
            <a href="/admin/vendors" className="underline">
              Vendors
            </a>
            .
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search business, contact, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="whitespace-nowrap">Events</TableHead>
                <TableHead className="hidden xl:table-cell">Last event</TableHead>
                <TableHead className="whitespace-nowrap">Last signup</TableHead>
                <TableHead className="text-right">Copy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <div className="h-8 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-14 text-center text-muted-foreground"
                  >
                    {rows.length === 0
                      ? 'No vendors yet. Once people sign up for an event vendor slot, they appear here.'
                      : 'No vendors match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={`${r.email}|${r.business_name}`}>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate font-medium" title={r.business_name}>
                        {r.business_name || '—'}
                      </div>
                      {r.category ? (
                        <div className="text-xs text-muted-foreground capitalize">
                          {r.category}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden max-w-[160px] truncate md:table-cell">
                      {r.contact_name || '—'}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <a
                        href={`mailto:${r.email}`}
                        className="truncate text-sm text-primary underline-offset-2 hover:underline"
                        title={r.email}
                      >
                        {r.email || '—'}
                      </a>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {r.phone ? (
                        <a
                          href={`tel:${r.phone}`}
                          className="font-mono text-xs text-primary"
                        >
                          {r.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center font-semibold">
                      {r.event_count}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate xl:table-cell">
                      {r.last_event_title}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateShort(r.last_signup_at.slice(0, 10))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.email ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => copyText(r.email, 'email')}
                            title="Copy email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {r.phone ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => copyText(r.phone, 'phone')}
                            title="Copy phone"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() =>
                            copyText(
                              [r.business_name, r.email, r.phone]
                                .filter(Boolean)
                                .join(' · '),
                              'vendor card'
                            )
                          }
                          title="Copy full contact card"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
