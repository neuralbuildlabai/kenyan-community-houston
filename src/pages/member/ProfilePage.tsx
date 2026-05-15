import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Save, User, Users, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  GENERAL_LOCATION_AREA_LABEL,
  GENERAL_LOCATION_AREA_VALUES,
  PROFESSIONAL_FIELD_LABEL,
  PROFESSIONAL_FIELD_VALUES,
} from '@/lib/memberDemographics'
import {
  buildProfilesSelfServicePatch,
  classifyProfileSaveSupabaseError,
  GENERIC_PROFILE_SAVE_FAILURE,
  LOCATION_PROFESSION_VALIDATION_MESSAGE,
  logSupabaseErrorDebug,
} from '@/lib/profilePayload'
import { validatePhoneNumber } from '@/lib/phoneValidation'
import { InviteSomeoneDialog } from '@/components/community/InviteSomeoneDialog'
import { requiresProfilePasswordRefresh } from '@/lib/profilePasswordGate'
import { hasEmailPasswordIdentity } from '@/lib/passwordPolicy'

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
    const built = buildProfilesSelfServicePatch(row)
    if (!built.ok) {
      toast.error(built.message)
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update(built.patch).eq('id', user.id)
      if (error) {
        logSupabaseErrorDebug('profiles.update', error)
        throw error
      }
      const { error: memErr } = await supabase
        .from('members')
        .update({
          general_location_area: built.patch.general_location_area,
          professional_field: built.patch.professional_field,
          professional_field_other: built.patch.professional_field_other,
        })
        .eq('user_id', user.id)
      if (memErr) logSupabaseErrorDebug('members.demographics', memErr)
      toast.success('Profile saved')
      await refreshProfile()
      await loadAll()
    } catch (e: unknown) {
      const pe = e as { code?: string; message?: string; details?: string | null; hint?: string | null }
      logSupabaseErrorDebug('profiles.save', pe)
      const hint = classifyProfileSaveSupabaseError(pe)
      toast.error(hint === 'location_profession' ? LOCATION_PROFESSION_VALIDATION_MESSAGE : GENERIC_PROFILE_SAVE_FAILURE)
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
      const pe = e as { code?: string; message?: string; details?: string | null; hint?: string | null }
      logSupabaseErrorDebug('profiles.avatar', pe)
      toast.error(GENERIC_PROFILE_SAVE_FAILURE)
    }
  }

  async function saveHouseholdMember(d: HhDraft) {
    if (!user || !d.full_name?.trim()) {
      toast.error('Full name is required')
      return
    }
    const hp = validatePhoneNumber(d.phone ?? '', { allowEmpty: true })
    if (!hp.ok) {
      toast.error(hp.reason)
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
            phone: hp.value,
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
          phone: hp.value,
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
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-7 w-7 text-primary shrink-0" />
              My profile
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-lg">Keep your member information up to date.</p>
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
            <InviteSomeoneDialog triggerVariant="outline" />
          </div>
        </div>

        {user && hasEmailPasswordIdentity(user) ? (
          <Card className="border-border/80 shadow-sm" data-testid="profile-password-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {requiresProfilePasswordRefresh(row as Profile, user) ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2.5 py-1.5">
                  Password update required before continuing.
                </p>
              ) : null}
              <p className="text-muted-foreground">
                Last changed:{' '}
                <span className="text-foreground font-medium">
                  {row.password_changed_at ? new Date(row.password_changed_at).toLocaleDateString() : 'Not recorded'}
                </span>
              </p>
              <p className="text-muted-foreground">
                Expires:{' '}
                <span className="text-foreground font-medium">
                  {row.password_expires_at ? new Date(row.password_expires_at).toLocaleDateString() : 'Update required'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">For security, passwords are renewed every 6 months.</p>
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link to="/change-password?next=%2Fprofile">Change password</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Account</CardTitle>
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

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Profile photo</CardTitle>
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

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contact & location</CardTitle>
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
              <Label htmlFor="profile-general-location">General Houston-area location *</Label>
              <Select
                value={(row.general_location_area as string) || '__none__'}
                onValueChange={(v) => setRow((r) => ({ ...r, general_location_area: v === '__none__' ? null : v }))}
              >
                <SelectTrigger id="profile-general-location" data-testid="profile-general-location">
                  <SelectValue placeholder="Select an area" />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  <SelectItem value="__none__" disabled>
                    Select an area
                  </SelectItem>
                  {GENERAL_LOCATION_AREA_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {GENERAL_LOCATION_AREA_LABEL[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Choose the broad area closest to you (used in aggregate metrics only).</p>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2 border-t pt-3 mt-1">
              Private contact details are visible only to authorized admins. Public areas use broad, safe information only.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Community profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>County / heritage</Label>
              <Input value={row.county_or_heritage ?? ''} onChange={(e) => setRow((r) => ({ ...r, county_or_heritage: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Preferred contact</Label>
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
              <Label htmlFor="profile-professional">Profession</Label>
              <Select
                value={(row.professional_field as string) || '__none__'}
                onValueChange={(v) =>
                  setRow((r) => ({
                    ...r,
                    professional_field: v === '__none__' ? null : v,
                    professional_field_other: v !== 'other' ? null : r.professional_field_other,
                  }))
                }
              >
                <SelectTrigger id="profile-professional" data-testid="profile-professional-field">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Optional</SelectItem>
                  {PROFESSIONAL_FIELD_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {PROFESSIONAL_FIELD_LABEL[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Used only for aggregate community planning.</p>
            </div>
            {row.professional_field === 'other' ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="profile-professional-other">Other profession *</Label>
                <Input
                  id="profile-professional-other"
                  data-testid="profile-professional-other"
                  maxLength={80}
                  value={row.professional_field_other ?? ''}
                  onChange={(e) => setRow((r) => ({ ...r, professional_field_other: e.target.value }))}
                />
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-foreground">Interests</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROFILE_INTEREST_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={(row.interests ?? []).includes(opt)} onCheckedChange={() => toggleInterest(opt)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Bio & emergency</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Service</CardTitle>
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
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Household
              </CardTitle>
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

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/profile/media">Media submissions</Link>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => void saveProfile()} disabled={saving}>
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
