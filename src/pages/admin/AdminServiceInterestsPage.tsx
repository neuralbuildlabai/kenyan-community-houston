import { useEffect, useMemo, useState } from 'react'
import { HeartHandshake, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { formatDateShort } from '@/lib/utils'
import { SERVICE_AVAILABILITY_OPTIONS, SERVICE_STATUS_OPTIONS } from '@/lib/serveOpportunities'
import type { ServiceInterest, ServiceInterestAvailability, ServiceInterestStatus } from '@/lib/types'
import { toast } from 'sonner'

function availabilityLabel(v: ServiceInterestAvailability) {
  return SERVICE_AVAILABILITY_OPTIONS.find((o) => o.value === v)?.label ?? v
}

function statusLabel(v: ServiceInterestStatus) {
  return SERVICE_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function AdminServiceInterestsPage() {
  const [items, setItems] = useState<ServiceInterest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ServiceInterest | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ServiceInterestStatus | 'all'>('all')
  const [filterAvailability, setFilterAvailability] = useState<ServiceInterestAvailability | 'all'>('all')
  const [statusDraft, setStatusDraft] = useState<ServiceInterestStatus>('new')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('service_interests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      toast.error(error.message || 'Could not load submissions')
      setItems([])
    } else {
      setItems((data as ServiceInterest[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (selected) setStatusDraft(selected.status)
  }, [selected])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((row) => {
      if (filterStatus !== 'all' && row.status !== filterStatus) return false
      if (filterAvailability !== 'all' && row.availability !== filterAvailability) return false
      if (!q) return true
      const blob = [
        row.full_name,
        row.email,
        row.area_of_interest ?? '',
        row.how_to_help ?? '',
        row.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [items, search, filterStatus, filterAvailability])

  async function saveStatus() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('service_interests').update({ status: statusDraft }).eq('id', selected.id)
    setSaving(false)
    if (error) {
      toast.error(error.message || 'Update failed')
      return
    }
    toast.success('Status updated')
    setItems((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status: statusDraft } : r)))
    setSelected((prev) => (prev ? { ...prev, status: statusDraft } : null))
  }

  async function archiveRow(id: string) {
    const { error } = await supabase.from('service_interests').update({ status: 'archived' as const }).eq('id', id)
    if (error) {
      toast.error(error.message || 'Could not archive')
      return
    }
    toast.success('Archived')
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'archived' } : r)))
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status: 'archived' } : null))
    setStatusDraft('archived')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartHandshake className="h-7 w-7 text-primary" />
          Service interests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Volunteer and leadership interest submissions from the public Call to Serve form.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-wrap items-stretch lg:items-end">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, area, notes…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ServiceInterestStatus | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {SERVICE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Availability</Label>
            <Select
              value={filterAvailability}
              onValueChange={(v) => setFilterAvailability(v as ServiceInterestAvailability | 'all')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {SERVICE_AVAILABILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="text-right text-xs">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <div className="h-8 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No matching submissions
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selected?.id === row.id ? 'bg-muted' : ''}`}
                    onClick={() => setSelected(row)}
                  >
                    <TableCell className="font-medium max-w-[140px] truncate">{row.full_name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm truncate max-w-[160px]">{row.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs font-normal">
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateShort(row.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div>
          {selected ? (
            <Card className="shadow-sm">
              <CardHeader className="space-y-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{selected.full_name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                        {selected.email}
                      </a>
                      {selected.phone ? (
                        <>
                          {' · '}
                          <a href={`tel:${selected.phone}`} className="hover:underline">
                            {selected.phone}
                          </a>
                        </>
                      ) : null}
                    </CardDescription>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDateShort(selected.created_at)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2 items-center">
                  <Label className="text-xs text-muted-foreground shrink-0">Status</Label>
                  <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as ServiceInterestStatus)}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => void saveStatus()} disabled={saving || statusDraft === selected.status}>
                    Save status
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void archiveRow(selected.id)}
                    disabled={selected.status === 'archived'}
                  >
                    Archive
                  </Button>
                </div>

                <div className="grid gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Availability</p>
                    <p className="text-foreground mt-0.5">{availabilityLabel(selected.availability)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Open to leadership contact</p>
                    <p className="text-foreground mt-0.5">{selected.open_to_leadership_contact ? 'Yes' : 'No'}</p>
                  </div>
                  {selected.area_of_interest ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Area of interest</p>
                      <p className="text-foreground mt-0.5 whitespace-pre-wrap">{selected.area_of_interest}</p>
                    </div>
                  ) : null}
                  {selected.how_to_help ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">How they would like to help</p>
                      <p className="text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{selected.how_to_help}</p>
                    </div>
                  ) : null}
                  {selected.skills_experience ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills / experience</p>
                      <p className="text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{selected.skills_experience}</p>
                    </div>
                  ) : null}
                  {selected.notes ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                      <p className="text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{selected.notes}</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
              Select a row to view full details and update status.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
