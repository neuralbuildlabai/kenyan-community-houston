import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Save, User, Users, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { SEOHead } from '@/components/SEOHead'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Profile, ProfileHouseholdMember } from '@/lib/types'
import { postLogoutPath } from '@/lib/logoutRedirect'
import { PROFILE_INTEREST_OPTIONS, HOUSEHOLD_RELATIONSHIP_OPTIONS, PREFERRED_COMMUNICATION_OPTIONS } from '@/lib/profileConstants'
import { AVATAR_MAX_BYTES, KIGH_MEMBER_MEDIA_BUCKET, isAllowedAvatarMime } from '@/lib/memberStorage'
import { sanitizeStorageFileName } from '@/lib/kighPrivateStorage'
import { PRIVATE_SIGNED_URL_EXPIRY_SEC } from '@/lib/kighPrivateStorage'

type HhDraft = Partial<ProfileHouseholdMember> & { id?: string }

export function ProfilePage() {
  const { user, signOut, refreshProfile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [row, setRow] = useState<Partial<Profile>>({})
  const [household, setHousehold] = useState<ProfileHouseholdMember[]>([])
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [hhDialog, setHhDialog] = useState<{ open: boolean; draft: HhDraft | null }>({ open: false, draft: null })

  const loadAvatarPreview = useCallback(
    async (bucket: string | null | undefined, path: string | null | undefined) => {
      if (!bucket || !path) {
        setAvatarPreviewUrl(null)
        return
      }
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, PRIVATE_SIGNED_URL_EXPIRY_SEC)
      if (!error && data?.signedUrl) setAvatarPreviewUrl(data.signedUrl)
      else setAvatarPreviewUrl(null)
    },
    []
  )

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: initialProfile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (error) throw error
      let p = initialProfile
      if (!p) {
        const ins = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email ?? '',
            full_name: (user.user_metadata as { full_name?: string })?.full_name ?? null,
          })
          .select('*')
          .single()
        if (ins.error) throw ins.error
        p = ins.data as Profile
      }
      setRow(p as Profile)
      await loadAvatarPreview(p.avatar_storage_bucket, p.avatar_storage_path)

      const { data: hh, error: hhErr } = await supabase
        .from('profile_household_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (hhErr) throw hhErr
      setHousehold((hh as ProfileHouseholdMember[]) ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load profile'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [user, loadAvatarPreview])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  function toggleInterest(label: string) {
    const cur = new Set(row.interests ?? [])
    if (cur.has(label)) cur.delete(label)
    else cur.add(label)
    setRow((r) => ({ ...r, interests: [...cur] }))
  }

  async function handleLogout() {
    await signOut()
    navigate(postLogoutPath(location.pathname))
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    try {
      const patch = {
        full_name: row.full_name?.trim() || null,
        preferred_name: row.preferred_name?.trim() || null,
        phone: row.phone?.trim() || null,
        bio: row.bio?.trim() || null,
        city: row.city?.trim() || null,
        state: row.state?.trim() || null,
        zip_code: row.zip_code?.trim() || null,
        county_or_heritage: row.county_or_heritage?.trim() || null,
        preferred_communication: row.preferred_communication?.trim() || null,
        occupation: row.occupation?.trim() || null,
        business_or_profession: row.business_or_profession?.trim() || null,
        emergency_contact_name: row.emergency_contact_name?.trim() || null,
        emergency_contact_phone: row.emergency_contact_phone?.trim() || null,
        interests: row.interests ?? [],
        willing_to_volunteer: !!row.willing_to_volunteer,
        willing_to_serve: !!row.willing_to_serve,
        volunteer_interests: row.volunteer_interests ?? [],
        service_notes: row.service_notes?.trim() || null,
        profile_visibility: row.profile_visibility ?? 'private',
        email: user.email ?? row.email,
      }
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
      if (error) throw error
      toast.success('Profile saved')
      await refreshProfile()
      await loadAll()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onAvatarChange(file: File | null) {
    if (!file || !user) return
    if (!isAllowedAvatarMime(file.type)) {
      toast.error('Avatar must be JPEG, PNG, or WebP')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error('Avatar must be 5 MB or smaller')
      return
    }
    const path = `${user.id}/${sanitizeStorageFileName(`avatar-${Date.now()}-${file.name}`)}`
    try {
      if (row.avatar_storage_bucket === KIGH_MEMBER_MEDIA_BUCKET && row.avatar_storage_path) {
        await supabase.storage.from(KIGH_MEMBER_MEDIA_BUCKET).remove([row.avatar_storage_path])
      }
      const { error: up } = await supabase.storage.from(KIGH_MEMBER_MEDIA_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (up) throw up
      const { error: db } = await supabase
        .from('profiles')
        .update({
          avatar_storage_bucket: KIGH_MEMBER_MEDIA_BUCKET,
          avatar_storage_path: path,
          avatar_original_filename: file.name,
          avatar_mime_type: file.type,
          avatar_file_size: file.size,
          avatar_url: null,
        })
        .eq('id', user.id)
      if (db) throw db
      toast.success('Avatar updated')
      await refreshProfile()
      await loadAll()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  async function saveHouseholdMember(d: HhDraft) {
    if (!user || !d.full_name?.trim()) {
      toast.error('Full name is required')
      return
    }
    try {
      if (d.id) {
        const { error } = await supabase
          .from('profile_household_members')
          .update({
            full_name: d.full_name.trim(),
            relationship: d.relationship?.trim() || null,
            age_group: (d.age_group as 'adult' | 'youth' | 'child' | null) ?? null,
            email: d.email?.trim() || null,
            phone: d.phone?.trim() || null,
            notes: d.notes?.trim() || null,
          })
          .eq('id', d.id)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('profile_household_members').insert({
          user_id: user.id,
          full_name: d.full_name.trim(),
          relationship: d.relationship?.trim() || null,
          age_group: (d.age_group as 'adult' | 'youth' | 'child' | null) ?? null,
          email: d.email?.trim() || null,
          phone: d.phone?.trim() || null,
          notes: d.notes?.trim() || null,
        })
        if (error) throw error
      }
      toast.success('Household member saved')
      setHhDialog({ open: false, draft: null })
      await loadAll()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function deleteHouseholdMember(id: string) {
    if (!user) return
    const { error } = await supabase.from('profile_household_members').delete().eq('id', id).eq('user_id', user.id)
    if (error) toast.error(error.message)
    else {
      toast.success('Removed')
      await loadAll()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <SEOHead title="My profile" description="Update your KIGH community profile, household, and interests." />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-7 w-7 text-primary shrink-0" />
              My profile
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-xl">
              Your information is private by default. KIGH leadership may view profiles to support programs and membership.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/dashboard">Admin dashboard</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Email is managed by your login provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Profile visibility</Label>
              <Select
                value={row.profile_visibility ?? 'private'}
                onValueChange={(v) => setRow((r) => ({ ...r, profile_visibility: v as Profile['profile_visibility'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private (recommended)</SelectItem>
                  <SelectItem value="members_only">Members only (future)</SelectItem>
                  <SelectItem value="public">Public (future)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
            <CardDescription>Stored securely; only you and authorized admins can view.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="h-24 w-24 rounded-full border bg-muted overflow-hidden shrink-0 flex items-center justify-center text-muted-foreground text-sm">
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-8 w-8" />
              )}
            </div>
            <div className="space-y-2">
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void onAvatarChange(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · max 5 MB</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & location</CardTitle>
            <CardDescription>Fields marked * are especially helpful for community outreach.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="profile-full-name">Full name *</Label>
              <Input
                id="profile-full-name"
                data-testid="profile-input-full-name"
                value={row.full_name ?? ''}
                onChange={(e) => setRow((r) => ({ ...r, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred name</Label>
              <Input value={row.preferred_name ?? ''} onChange={(e) => setRow((r) => ({ ...r, preferred_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Phone *</Label>
              <Input
                id="profile-phone"
                data-testid="profile-input-phone"
                value={row.phone ?? ''}
                onChange={(e) => setRow((r) => ({ ...r, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={row.city ?? ''} onChange={(e) => setRow((r) => ({ ...r, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={row.state ?? ''} onChange={(e) => setRow((r) => ({ ...r, state: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={row.zip_code ?? ''} onChange={(e) => setRow((r) => ({ ...r, zip_code: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>County or heritage</Label>
              <Input value={row.county_or_heritage ?? ''} onChange={(e) => setRow((r) => ({ ...r, county_or_heritage: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Preferred communication</Label>
              <Select
                value={row.preferred_communication ?? '__none__'}
                onValueChange={(v) => setRow((r) => ({ ...r, preferred_communication: v === '__none__' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {PREFERRED_COMMUNICATION_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Bio</Label>
              <Textarea rows={3} value={row.bio ?? ''} onChange={(e) => setRow((r) => ({ ...r, bio: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Occupation</Label>
              <Input value={row.occupation ?? ''} onChange={(e) => setRow((r) => ({ ...r, occupation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Business or profession</Label>
              <Input value={row.business_or_profession ?? ''} onChange={(e) => setRow((r) => ({ ...r, business_or_profession: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency contact name</Label>
              <Input value={row.emergency_contact_name ?? ''} onChange={(e) => setRow((r) => ({ ...r, emergency_contact_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency contact phone</Label>
              <Input value={row.emergency_contact_phone ?? ''} onChange={(e) => setRow((r) => ({ ...r, emergency_contact_phone: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
            <CardDescription>Select areas you care about.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {PROFILE_INTEREST_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={(row.interests ?? []).includes(opt)} onCheckedChange={() => toggleInterest(opt)} />
                <span>{opt}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volunteering & service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!row.willing_to_volunteer} onCheckedChange={(c) => setRow((r) => ({ ...r, willing_to_volunteer: !!c }))} />
              I am willing to volunteer with KIGH programs or events
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!row.willing_to_serve} onCheckedChange={(c) => setRow((r) => ({ ...r, willing_to_serve: !!c }))} />
              I am willing to explore serving in a committee or leadership capacity
            </label>
            <div className="space-y-1.5">
              <Label>Volunteer interests (one per line)</Label>
              <Textarea
                rows={3}
                value={(row.volunteer_interests ?? []).join('\n')}
                onChange={(e) =>
                  setRow((r) => ({
                    ...r,
                    volunteer_interests: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Service notes</Label>
              <Textarea rows={2} value={row.service_notes ?? ''} onChange={(e) => setRow((r) => ({ ...r, service_notes: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Household
              </CardTitle>
              <CardDescription>Family members you would like to keep on file with your profile.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setHhDialog({ open: true, draft: { full_name: '' } })}>
              Add member
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {household.length === 0 ? (
              <p className="text-sm text-muted-foreground">No household members added yet.</p>
            ) : (
              <ul className="space-y-3">
                {household.map((h) => (
                  <li key={h.id} className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1 text-sm min-w-0">
                      <div className="font-medium">{h.full_name}</div>
                      <div className="flex flex-wrap gap-2 text-muted-foreground">
                        {h.relationship ? <Badge variant="secondary">{h.relationship}</Badge> : null}
                        {h.age_group ? <span>{h.age_group}</span> : null}
                        {h.email ? <span>{h.email}</span> : null}
                        {h.phone ? <span>{h.phone}</span> : null}
                      </div>
                      {h.notes ? <p className="text-xs text-muted-foreground">{h.notes}</p> : null}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => setHhDialog({ open: true, draft: { ...h } })}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteHouseholdMember(h.id)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link to="/profile/media">Community media submissions</Link>
          </Button>
          <Button className="gap-2" onClick={() => void saveProfile()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </Button>
        </div>
      </div>

      <Dialog open={hhDialog.open} onOpenChange={(o) => !o && setHhDialog({ open: false, draft: null })}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{hhDialog.draft?.id ? 'Edit household member' : 'Add household member'}</DialogTitle>
          </DialogHeader>
          {hhDialog.draft ? (
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label>Full name *</Label>
                <Input value={hhDialog.draft.full_name ?? ''} onChange={(e) => setHhDialog((d) => ({ ...d, draft: { ...d.draft!, full_name: e.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Relationship</Label>
                <Select
                  value={hhDialog.draft.relationship ?? '__none__'}
                  onValueChange={(v) => setHhDialog((d) => ({ ...d, draft: { ...d.draft!, relationship: v === '__none__' ? null : v } }))}
                >
                  <SelectTrigger data-testid="household-relationship">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {HOUSEHOLD_RELATIONSHIP_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Age group</Label>
                <Select
                  value={hhDialog.draft.age_group ?? '__none__'}
                  onValueChange={(v) =>
                    setHhDialog((d) => ({
                      ...d,
                      draft: {
                        ...d.draft!,
                        age_group: v === '__none__' ? null : (v as 'adult' | 'youth' | 'child'),
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="youth">Youth</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Email (optional)</Label>
                <Input value={hhDialog.draft.email ?? ''} onChange={(e) => setHhDialog((d) => ({ ...d, draft: { ...d.draft!, email: e.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone (optional)</Label>
                <Input value={hhDialog.draft.phone ?? ''} onChange={(e) => setHhDialog((d) => ({ ...d, draft: { ...d.draft!, phone: e.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea rows={2} value={hhDialog.draft.notes ?? ''} onChange={(e) => setHhDialog((d) => ({ ...d, draft: { ...d.draft!, notes: e.target.value } }))} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setHhDialog({ open: false, draft: null })}>
              Cancel
            </Button>
            <Button type="button" onClick={() => hhDialog.draft && void saveHouseholdMember(hhDialog.draft)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
