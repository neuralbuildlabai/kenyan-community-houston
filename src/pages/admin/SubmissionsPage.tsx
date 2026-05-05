import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { pendingQueuePublishPayload, pendingQueueRejectPayload } from '@/lib/publishLifecycle'
import { formatDateShort } from '@/lib/utils'
import { toast } from 'sonner'

type ContentType = 'events' | 'announcements' | 'businesses' | 'fundraisers'

interface PendingItem {
  id: string
  title?: string
  name?: string
  category: string
  created_at: string
  status: string
}

function getTitle(item: PendingItem) {
  return item.title ?? item.name ?? '—'
}

export function AdminSubmissionsPage() {
  const [activeTab, setActiveTab] = useState<ContentType>('events')
  const [items, setItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ events: 0, announcements: 0, businesses: 0, fundraisers: 0 })

  async function loadCounts() {
    const [{ count: e }, { count: a }, { count: b }, { count: f }] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('fundraisers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setCounts({ events: e ?? 0, announcements: a ?? 0, businesses: b ?? 0, fundraisers: f ?? 0 })
  }

  async function load(type: ContentType) {
    setLoading(true)
    const col = type === 'businesses' ? 'name' : 'title'
    const { data } = await supabase
      .from(type)
      .select(`id, ${col}, category, created_at, status`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setItems((data ?? []) as PendingItem[])
    setLoading(false)
  }

  useEffect(() => { loadCounts() }, [])
  useEffect(() => { load(activeTab) }, [activeTab])

  async function approve(id: string) {
    const { data, error } = await supabase
      .from(activeTab)
      .update(pendingQueuePublishPayload())
      .eq('id', id)
      .select('id')
    if (error) toast.error(error.message || 'Failed to approve')
    else if (!data?.length) toast.error('Could not update — no matching row (check permissions).')
    else {
      toast.success('Approved and published')
      load(activeTab)
      loadCounts()
    }
  }

  async function reject(id: string) {
    const { data, error } = await supabase.from(activeTab).update(pendingQueueRejectPayload()).eq('id', id).select('id')
    if (error) toast.error(error.message || 'Failed to reject')
    else if (!data?.length) toast.error('Could not update — no matching row (check permissions).')
    else {
      toast.success('Submission rejected')
      load(activeTab)
      loadCounts()
    }
  }

  const tabLabel = (type: ContentType) => {
    const n = counts[type]
    return `${type.charAt(0).toUpperCase() + type.slice(1)}${n > 0 ? ` (${n})` : ''}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Submissions</h1>
        <p className="text-muted-foreground text-sm">Review and moderate community-submitted content.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="events">{tabLabel('events')}</TabsTrigger>
          <TabsTrigger value="announcements">{tabLabel('announcements')}</TabsTrigger>
          <TabsTrigger value="businesses">{tabLabel('businesses')}</TabsTrigger>
          <TabsTrigger value="fundraisers">{tabLabel('fundraisers')}</TabsTrigger>
        </TabsList>

        {(['events', 'announcements', 'businesses', 'fundraisers'] as ContentType[]).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={4}><div className="h-8 bg-muted animate-pulse rounded" /></TableCell></TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-12">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-muted-foreground">No pending {type}</p>
                    </TableCell></TableRow>
                  ) : items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[220px] truncate">{getTitle(item)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.category}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDateShort(item.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-7 border-green-300 text-green-700 hover:bg-green-50" onClick={() => approve(item.id)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 border-red-300 text-red-700 hover:bg-red-50" onClick={() => reject(item.id)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
