import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2, UserPlus } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { KighLogo } from '@/components/KighLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { MEMBERSHIP_INTEREST_OPTIONS } from '@/lib/constants'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getBrowserOrigin } from '@/lib/siteOrigin'
import { isGoogleAuthEnabled } from '@/lib/featureFlags'
import { claimOrCreateMemberForAuthUser } from '@/lib/memberSync'
import { buildMembershipSignupAuthMetadata } from '@/lib/membershipAuthMetadata'

type MembershipType = 'individual' | 'family_household' | 'associate'

type HouseholdRow = {
  full_name: string
  relationship: string
  age_group: '' | 'adult' | 'youth' | 'child'
  email: string
  phone: string
}

const emptyHousehold = (): HouseholdRow => ({
  full_name: '',
  relationship: '',
  age_group: '',
  email: '',
  phone: '',
})

export function MembershipPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pendingAccountCreated, setPendingAccountCreated] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [membershipType, setMembershipType] = useState<MembershipType>('individual')
  const [interests, setInterests] = useState<string[]>([])
  const [agreed, setAgreed] = useState(false)
  const [consent, setConsent] = useState(false)
  const [household, setHousehold] = useState<HouseholdRow[]>([emptyHousehold()])

  const [primary, setPrimary] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: 'TX',
    zip_code: '',
    kenyan_county_or_heritage: '',
    preferred_communication: 'email',
  })

  function updateHousehold(idx: number, patch: Partial<HouseholdRow>) {
    setHousehold((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata as Record<string, unknown> | undefined
    const full =
      (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta?.name === 'string' && meta.name.trim()) ||
      ''
    const parts = full.split(/\s+/).filter(Boolean)
    const firstFromMeta = parts[0] ?? ''
    const lastFromMeta = parts.length > 1 ? parts.slice(1).join(' ') : ''
    setPrimary((p) => ({
      ...p,
      email: (user.email ?? p.email).trim(),
      first_name: p.first_name.trim() || firstFromMeta,
      last_name: p.last_name.trim() || lastFromMeta,
    }))
  }, [user])

  async function handleGoogleSignup() {
    if (!isGoogleAuthEnabled()) return
    const origin = getBrowserOrigin()
    if (!origin) {
      toast.error('Cannot start Google sign in (missing page origin).')
      return
    }
    setOauthLoading(true)
    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/membership')}`,
        skipBrowserRedirect: true,
      },
    })
    setOauthLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (oauthData?.url) window.location.assign(oauthData.url)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed || !consent) {
      toast.error('Please confirm both required checkboxes')
      return
    }
    if (!primary.first_name.trim() || !primary.last_name.trim()) {
      toast.error('First and last name are required')
      return
    }
    if (!primary.phone.trim()) {
      toast.error('Phone is required')
      return
    }
    if (!user) {
      if (!primary.email.trim()) {
        toast.error('Email is required')
        return
      }
      if (!password) {
        toast.error('Password is required')
        return
      }
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters')
        return
      }
      if (!confirmPassword) {
        toast.error('Please confirm your password')
        return
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
    } else {
      const signedInEmail = (user.email ?? '').trim().toLowerCase()
      const formEmail = primary.email.trim().toLowerCase()
      if (signedInEmail && formEmail && signedInEmail !== formEmail) {
        toast.error('Email must match the address you are signed in with, or sign out to register with a different email.')
        return
      }
    }
    if (membershipType === 'family_household') {
      const validRows = household.filter((h) => h.full_name.trim())
      if (validRows.length === 0) {
        toast.error('Add at least one household member with a full name')
        return
      }
    }
    setLoading(true)

    if (!user) {
      const origin = getBrowserOrigin()
      const householdCount =
        membershipType === 'family_household'
          ? household.filter((h) => h.full_name.trim()).length || 1
          : 1
      const meta = buildMembershipSignupAuthMetadata({
        first_name: primary.first_name,
        last_name: primary.last_name,
        phone: primary.phone,
        membership_type: membershipType,
        interests,
        household_count: householdCount,
        preferred_communication: primary.preferred_communication,
      })
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: primary.email.trim(),
        password,
        options: {
          emailRedirectTo: origin
            ? `${origin}/auth/callback?next=${encodeURIComponent('/membership')}`
            : undefined,
          data: {
            ...meta,
          },
        },
      })
      if (signUpErr) {
        setLoading(false)
        toast.error(signUpErr.message || 'Could not create account')
        return
      }
      if (!signUpData.user) {
        setLoading(false)
        toast.error('Sign up did not return a user. Please try again.')
        return
      }
      if (!signUpData.session) {
        setLoading(false)
        setPendingAccountCreated(true)
        toast.info('Confirm your email', {
          description:
            'We saved your membership intake as pending. After you confirm your email, sign in and return here to complete required agreements and details.',
        })
        return
      }
      const { error: syncErr } = await claimOrCreateMemberForAuthUser(supabase)
      if (syncErr) {
        console.warn('[membership] claimOrCreateMemberForAuthUser after signup:', syncErr.message)
      }
    }

    const { data: authUserResp } = await supabase.auth.getUser()
    const authUser = authUserResp.user
    if (!authUser?.id) {
      setLoading(false)
      toast.error('You must be signed in to submit membership. Please sign in and try again.')
      return
    }

    const fullName = `${primary.first_name.trim()} ${primary.last_name.trim()}`.trim()
    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        email: primary.email.trim().toLowerCase(),
        full_name: fullName,
        phone: primary.phone.trim() || null,
        city: primary.city.trim() || null,
        state: primary.state.trim() || null,
        zip_code: primary.zip_code.trim() || null,
        county_or_heritage: primary.kenyan_county_or_heritage.trim() || null,
        preferred_communication: primary.preferred_communication.trim() || null,
        interests,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    if (profileErr) {
      setLoading(false)
      toast.error(profileErr.message || 'Could not save your profile')
      return
    }

    const householdPayload =
      membershipType === 'family_household'
        ? household
            .filter((h) => h.full_name.trim())
            .map((h) => ({
              full_name: h.full_name.trim(),
              relationship: h.relationship.trim() || null,
              age_group: h.age_group || null,
              email: h.email.trim() || null,
              phone: h.phone.trim() || null,
            }))
        : []

    const p_data = {
      first_name: primary.first_name.trim(),
      last_name: primary.last_name.trim(),
      email: primary.email.trim(),
      phone: primary.phone.trim(),
      address_line1: primary.address_line1.trim(),
      city: primary.city.trim(),
      state: primary.state.trim(),
      zip_code: primary.zip_code.trim(),
      kenyan_county_or_heritage: primary.kenyan_county_or_heritage.trim(),
      preferred_communication: primary.preferred_communication,
      membership_type: membershipType,
      interests,
      agreed_to_constitution: agreed,
      consent_to_communications: consent,
      household: householdPayload,
    }

    const { error } = await supabase.rpc('submit_membership_registration', { p_data })
    setLoading(false)
    if (error) {
      if (error.message?.includes('consent_required')) toast.error('Consent and agreement are required')
      else if (error.message?.includes('missing_required_fields')) toast.error('Please complete required fields')
      else if (error.message?.includes('authentication_required'))
        toast.error('Please sign in to submit membership.')
      else if (error.message?.includes('email_mismatch_with_signed_in_user'))
        toast.error('Email must match your signed-in account.')
      else if (error.message?.includes('member_email_registered_to_another_user'))
        toast.error('This email is already linked to another account. Contact support if you need help.')
      else toast.error(error.message || 'Registration failed. Please try again.')
      return
    }
    navigate('/membership/success')
  }

  return (
    <>
      <SEOHead
        title="Membership Registration"
        description="Register as an individual, family, or associate member of Kenyans in Greater Houston."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.07] via-background to-muted/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <KighLogo withCard className="h-[4.5rem] w-[4.5rem] shrink-0 shadow-sm" imgClassName="max-h-16" />
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <UserPlus className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">KIGH membership</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Membership registration</h1>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Join the Kenyan community in Greater Houston. Register as an individual, family, or associate member and stay connected to events, resources, and community support.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 -mt-2 mb-2">
        <Card className="border-primary/15 shadow-sm bg-muted/25">
          <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Membership keeps you connected.</span> Service helps move the community forward. If you are willing to help, you can also submit a service interest form.
            </p>
            <Button asChild size="sm" variant="default" className="shrink-0 w-full sm:w-auto">
              <Link to="/serve">Call to Serve</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
        {pendingAccountCreated && (
          <Card className="border-primary/25 bg-primary/[0.04] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Check your email</CardTitle>
              <CardDescription className="text-base text-foreground/90">
                Your account has been created and a pending membership record is on file. Confirm your email, then sign in and return here to finish required agreements and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Administrators can see your registration as pending until you complete the final step after verification.
              </p>
              <Button asChild>
                <Link to="/login">Go to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm border-primary/15 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/60">
            <CardTitle className="text-lg">Annual membership dues</CardTitle>
            <CardDescription className="text-base text-foreground/90 leading-relaxed">
              Dues are <strong className="text-foreground">$20 per year</strong>, due by <strong className="text-foreground">January 31</strong>. Payment is not collected on this website — use official channels when you are ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 text-sm text-muted-foreground leading-relaxed">
            Membership dues are $20 annually and due by January 31. Payment instructions are available on the{' '}
            <Link to="/support" className="text-primary font-semibold underline-offset-4 hover:underline">
              Support KIGH
            </Link>{' '}
            page.
          </CardContent>
        </Card>

        <form onSubmit={onSubmit} className="space-y-8">
          {!user && isGoogleAuthEnabled() ? (
            <Card className="shadow-sm border-primary/15">
              <CardHeader>
                <CardTitle className="text-lg">Create your account</CardTitle>
                <CardDescription>
                  Use Google or set an email and password below. Any valid email provider works (Gmail, Yahoo, Outlook, iCloud, work email, etc.). Passwords are only stored by Supabase Auth.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={loading || oauthLoading}
                  onClick={() => void handleGoogleSignup()}
                >
                  {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                </Button>
              </CardContent>
            </Card>
          ) : !user ? (
            <Card className="shadow-sm border-primary/15">
              <CardHeader>
                <CardTitle className="text-lg">Create your account</CardTitle>
                <CardDescription>
                  Enter your email and password below. Any valid email provider works (Gmail, Yahoo, Outlook, iCloud, work email, etc.). Passwords are only stored by Supabase Auth.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Primary member</CardTitle>
              <CardDescription>Contact details for the main registrant.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fn">First name *</Label>
                <Input id="fn" required value={primary.first_name} onChange={(e) => setPrimary((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln">Last name *</Label>
                <Input id="ln" required value={primary.last_name} onChange={(e) => setPrimary((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="em">Email *</Label>
                <Input
                  id="em"
                  type="email"
                  required
                  readOnly={!!user}
                  aria-readonly={!!user}
                  value={primary.email}
                  onChange={(e) => setPrimary((p) => ({ ...p, email: e.target.value }))}
                />
                {user ? (
                  <p className="text-xs text-muted-foreground">Email matches your signed-in account.</p>
                ) : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ph">Phone *</Label>
                <Input
                  id="ph"
                  type="tel"
                  required
                  value={primary.phone}
                  onChange={(e) => setPrimary((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="a1">Address line 1</Label>
                <Input id="a1" value={primary.address_line1} onChange={(e) => setPrimary((p) => ({ ...p, address_line1: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City *</Label>
                <Input id="city" required value={primary.city} onChange={(e) => setPrimary((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st">State *</Label>
                <Input id="st" required value={primary.state} onChange={(e) => setPrimary((p) => ({ ...p, state: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="zip">ZIP code *</Label>
                <Input id="zip" required value={primary.zip_code} onChange={(e) => setPrimary((p) => ({ ...p, zip_code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co">Kenyan county or heritage</Label>
                <Input id="co" value={primary.kenyan_county_or_heritage} onChange={(e) => setPrimary((p) => ({ ...p, kenyan_county_or_heritage: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Preferred communication *</Label>
                <Select value={primary.preferred_communication} onValueChange={(v) => setPrimary((p) => ({ ...p, preferred_communication: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {!user && (
            <Card className="shadow-sm border-primary/15">
              <CardHeader>
                <CardTitle className="text-lg">Account password *</CardTitle>
                <CardDescription>
                  Choose a password for the website. It is stored securely by Supabase Auth — never on a KIGH spreadsheet or custom table.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pw">Password *</Label>
                  <Input
                    id="pw"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pw2">Confirm password *</Label>
                  <Input
                    id="pw2"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={showPassword} onCheckedChange={(v) => setShowPassword(v === true)} />
                    Show passwords
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {user ? (
            <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 px-4 py-3">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>. Your membership will be linked to this account.
            </p>
          ) : null}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Membership type *</CardTitle>
              <CardDescription>Individual, household, or associate.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={membershipType} onValueChange={(v) => setMembershipType(v as MembershipType)}>
                <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual membership</SelectItem>
                  <SelectItem value="family_household">Family / household membership</SelectItem>
                  <SelectItem value="associate">Associate membership</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {membershipType === 'family_household' && (
            <Card className="shadow-sm border-dashed border-primary/25 bg-muted/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">Household members</CardTitle>
                  <CardDescription>Add everyone covered by this registration.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1 shrink-0"
                  onClick={() => setHousehold((h) => [...h, emptyHousehold()])}
                >
                  <Plus className="h-4 w-4" /> Add member
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {household.map((row, idx) => (
                  <div key={idx} className="rounded-xl border bg-background p-4 sm:p-5 space-y-3 relative shadow-sm">
                    {household.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setHousehold((h) => h.filter((_, i) => i !== idx))}
                        aria-label="Remove household member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Full name *</Label>
                        <Input value={row.full_name} onChange={(e) => updateHousehold(idx, { full_name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Relationship</Label>
                        <Input value={row.relationship} onChange={(e) => updateHousehold(idx, { relationship: e.target.value })} placeholder="e.g. Spouse, Child" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Age group</Label>
                        <Select value={row.age_group || 'none'} onValueChange={(v) => updateHousehold(idx, { age_group: v === 'none' ? '' : (v as HouseholdRow['age_group']) })}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            <SelectItem value="adult">Adult</SelectItem>
                            <SelectItem value="youth">Youth</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input type="email" value={row.email} onChange={(e) => updateHousehold(idx, { email: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input type="tel" value={row.phone} onChange={(e) => updateHousehold(idx, { phone: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Interests</CardTitle>
              <CardDescription>Select all areas you care about.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {MEMBERSHIP_INTEREST_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 text-sm cursor-pointer rounded-lg border border-transparent px-2 py-1.5 hover:bg-muted/50">
                  <Checkbox
                    checked={interests.includes(opt)}
                    onCheckedChange={(v) => {
                      if (v === true) setInterests((prev) => [...new Set([...prev, opt])])
                      else setInterests((prev) => prev.filter((x) => x !== opt))
                    }}
                  />
                  {opt}
                </label>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Agreements *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-start gap-3 text-sm cursor-pointer leading-relaxed">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1" />
                <span>
                  I agree to follow the KIGH{' '}
                  <Link to="/governance" className="text-primary font-semibold underline-offset-4 hover:underline">
                    Constitution, Bylaws, and Code of Conduct
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer leading-relaxed">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" />
                <span>
                  I consent to KIGH using my information for membership administration and community communication.
                </span>
              </label>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full sm:w-auto min-w-[200px] font-semibold" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit registration'}
          </Button>
        </form>
      </div>
    </>
  )
}
