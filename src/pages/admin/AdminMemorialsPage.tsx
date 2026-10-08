import { useEffect, useState } from 'react'
import { Eye, ExternalLink, QrCode } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { MEMORIALS, memorialPath } from '@/lib/memorials'
import {
  MEMORIAL_LIFECYCLE_STATUSES,
  memorialStatusLabel,
  memorialStatusMap,
  memorialStatusFor,
  normalizeMemorialStatus,
  type MemorialLifecycleStatus,
  type MemorialStateRow,
} from '@/lib/memorialLifecycle'
import { fetchMemorialStateRows, setMemorialStatus } from '@/lib/memorialStatesApi'
import { grantMemorialPreview } from '@/lib/memorialPreview'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Memorial content is defined in code (src/lib/memorials.ts) because the
 * funeral program, QR assets, and permanent URL are print-coupled. This page
 * manages the one thing admins need to change without a deploy: whether a
 * memorial is published on /memorials, or archived after the service.
 *
 * Archiving takes the page and its funeral program offline immediately. A
 * scanned QR code then shows a short archive notice, and admins can still
 * open the page here via Preview.
 */
export function AdminMemorialsPage() {
  const { user, session } = useAuth()
  const [rows, setRows] = useState<MemorialStateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSlug, setSavingSlug] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setRows(await fetchMemorialStateRows())
    } catch {
      toast.error('Could not load memorial states')
      setRows([])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const statuses = memorialStatusMap(rows)
  const archivedAtBySlug = Object.fromEntries(
    rows.map((r) => [r.slug, r.archived_at ?? null])
  ) as Record<string, string | null>

  async function changeStatus(slug: string, next: string) {
    setSavingSlug(slug)
    try {
      await setMemorialStatus({
        slug,
        status: normalizeMemorialStatus(next) as MemorialLifecycleStatus,
        adminId: user?.id ?? null,
      })
      toast.success(
        normalizeMemorialStatus(next) === 'archived'
          ? 'Memorial archived — the page is now offline'
          : 'Memorial published on /memorials'
      )
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
    setSavingSlug(null)
  }

  /** Archived pages are blocked at the edge; this hands it the preview cookie. */
  function openArchivedPreview(slug: string) {
    if (!grantMemorialPreview(session?.access_token)) {
      toast.error('Session expired — sign in again to preview')
      return
    }
    window.open(memorialPath(slug), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Memorials</h1>
        <p className="text-muted-foreground text-sm">
          {MEMORIALS.length} {MEMORIALS.length === 1 ? 'memorial' : 'memorials'} · archive a
          memorial after the service to take the page and its funeral program offline. Anyone
          scanning a printed QR code then sees a short archive notice.
        </p>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Dates</TableHead>
              <TableHead className="hidden lg:table-cell">Archived</TableHead>
              <TableHead>Listing</TableHead>
              <TableHead className="text-right">Links</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <div className="h-8 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : MEMORIALS.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No memorials in the registry.
                </TableCell>
              </TableRow>
            ) : (
              MEMORIALS.map((memorial) => {
                const status = memorialStatusFor(memorial.slug, statuses)
                const archivedAt = archivedAtBySlug[memorial.slug]
                return (
                  <TableRow key={memorial.slug}>
                    <TableCell className="font-medium max-w-[220px]">
                      <div className="space-y-1">
                        <span className="line-clamp-2">{memorial.fullName}</span>
                        {status === 'archived' && (
                          <Badge variant="outline" className="text-[10px]">
                            Offline to the public
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {memorial.dateOfBirth}
                      {memorial.dateOfPassing ? ` – ${memorial.dateOfPassing}` : ''}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {archivedAt ? formatDateShort(archivedAt) : '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={status}
                        disabled={savingSlug === memorial.slug}
                        onValueChange={(v) => changeStatus(memorial.slug, v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMORIAL_LIFECYCLE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {memorialStatusLabel(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {status === 'archived' ? (
                          <button
                            type="button"
                            onClick={() => openArchivedPreview(memorial.slug)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 rounded-sm"
                          >
                            <Eye className="h-3 w-3 shrink-0" />
                            Preview
                          </button>
                        ) : (
                          <a
                            href={memorialPath(memorial.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            Page
                          </a>
                        )}
                        <a
                          href={memorial.qrPrintPngPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <QrCode className="h-3 w-3 shrink-0" />
                          QR
                        </a>
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
  )
}
