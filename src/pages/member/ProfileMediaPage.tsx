import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, LogOut, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SEOHead } from '@/components/SEOHead'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { MemberMediaSubmission } from '@/lib/types'
import { postLogoutPath } from '@/lib/logoutRedirect'
import {
  KIGH_GALLERY_SUBMISSIONS_BUCKET,
  maxBytesForSubmission,
  submissionMediaType,
} from '@/lib/memberStorage'
import { sanitizeStorageFileName } from '@/lib/kighPrivateStorage'
import { PRIVATE_SIGNED_URL_EXPIRY_SEC } from '@/lib/kighPrivateStorage'

export function ProfileMediaPage() {
  const { user, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MemberMediaSubmission[]>([])
  const [events, setEvents] = useState<{ id: string; title: string }[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventId, setEventId] = useState<string>('__none__')
  const [permission, setPermission] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [{ data: m, error: e1 }, { data: ev }] = await Promise.all([
        supabase.from('member_media_submissions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('events').select('id, title').eq('status', 'published').order('start_date', { ascending: false }).limit(80),
      ])
      if (e1) throw e1
      setRows((m as MemberMediaSubmission[]) ?? [])
      setEvents((ev as { id: string; title: string }[]) ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  async function handleLogout() {
    await signOut()
    navigate(postLogoutPath(location.pathname))
  }

  async function submit() {
    if (!user || !file) {
      toast.error('Choose a file to upload')
      return
    }
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!permission) {
      toast.error('Please confirm you have the right to share this media')
      return
    }
    const mt = submissionMediaType(file.type)
    if (!mt) {
      toast.error('Allowed: JPEG, PNG, WebP, MP4, QuickTime, WebM')
      return
    }
    const maxB = maxBytesForSubmission(file.type)
    if (file.size > maxB) {
      toast.error(`File too large (max ${Math.round(maxB / (1024 * 1024))} MB for this type)`)
      return
    }
    const objectPath = `${user.id}/${crypto.randomUUID()}-${sanitizeStorageFileName(file.name)}`
    setSubmitting(true)
    try {
      const { error: up } = await supabase.storage.from(KIGH_GALLERY_SUBMISSIONS_BUCKET).upload(objectPath, file, {
        contentType: file.type,
        upsert: false,
      })
      if (up) throw up
      const { error: ins } = await supabase.from('member_media_submissions').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        media_type: mt,
        storage_bucket: KIGH_GALLERY_SUBMISSIONS_BUCKET,
        storage_path: objectPath,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        event_id: eventId === '__none__' ? null : eventId,
        permission_to_use: permission,
        status: 'pending',
      })
      if (ins) throw ins
      toast.success('Submission received — thank you! Our team will review it.')
      setTitle('')
      setDescription('')
      setEventId('__none__')
      setPermission(false)
      setFile(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function preview(row: MemberMediaSubmission) {
    const { data, error } = await supabase.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, PRIVATE_SIGNED_URL_EXPIRY_SEC)
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Could not preview')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <SEOHead title="Media submissions" description="Share photos or videos with KIGH for possible community use." />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
            <Link to="/profile" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/dashboard">Admin</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Community media</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Uploads stay private until reviewed. Approved items may be featured in the gallery at KIGH’s discretion.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New submission</CardTitle>
            <CardDescription>Images or short videos only. You will receive a confirmation on screen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Related event (optional)</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>File *</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Images up to 10 MB · videos up to 50 MB</p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={permission} onCheckedChange={(c) => setPermission(!!c)} className="mt-0.5" />
              <span>
                I confirm I have the right to share this media and allow KIGH to review it for possible community use.
              </span>
            </label>
            <Button className="gap-2" onClick={() => void submit()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Submit for review
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your submissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {rows.map((r) => (
                  <li key={r.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline">{r.status}</Badge>
                        <span>{r.media_type}</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void preview(r)}>
                      Preview
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
