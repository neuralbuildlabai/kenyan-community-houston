import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { MemberMediaSubmission, MemberMediaSubmissionStatus } from '@/lib/types'
import { PRIVATE_SIGNED_URL_EXPIRY_SEC } from '@/lib/kighPrivateStorage'

type Row = MemberMediaSubmission & { submitter_email?: string | null; submitter_name?: string | null }

const STATUSES: MemberMediaSubmissionStatus[] = ['pending', 'approved', 'rejected', 'archived']

export function AdminMediaSubmissionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data: subs, error } = await supabase.from('member_media_submissions').select('*').order('created_at', { ascending: false })
    if (error) {
      toast.error(error.message)
      setRows([])
      setLoading(false)
      return
    }
    const list = (subs as MemberMediaSubmission[]) ?? []
    const ids = [...new Set(list.map((s) => s.user_id))]
    let profileMap: Record<string, { email: string; full_name: string | null }> = {}
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, email, full_name').in('id', ids)
      profileMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]))
    }
    setRows(
      list.map((s) => ({
        ...s,
        submitter_email: profileMap[s.user_id]?.email ?? null,
        submitter_name: profileMap[s.user_id]?.full_name ?? null,
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function preview(row: MemberMediaSubmission) {
    const { data, error } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, PRIVATE_SIGNED_URL_EXPIRY_SEC)
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Could not preview')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function setStatus(id: string, status: MemberMediaSubmissionStatus) {
    const { error } = await supabase.from('member_media_submissions').update({ status }).eq('id', id)
    if (error) toast.error(error.message)
    else {
      toast.success('Updated')
      void load()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Media submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review member-submitted photos and videos. Files stay in private storage until you approve for possible gallery
          use. For the public event gallery queue, use <Link to="/admin/gallery" className="text-primary underline-offset-4 hover:underline">Admin → Gallery</Link>.
        </p>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Submitter</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No submissions yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[180px]">
                    <div className="truncate">{r.title}</div>
                    <div className="md:hidden text-xs text-muted-foreground truncate">{r.submitter_email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    <div className="truncate">{r.submitter_name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.submitter_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.media_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={(v) => void setStatus(r.id, v as MemberMediaSubmissionStatus)}>
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => void preview(r)}>
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
