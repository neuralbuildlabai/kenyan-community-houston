import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Trash2,
  Users2,
  CalendarCheck,
  Megaphone,
  Heart,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import {
  MEMBERSHIP_INTEREST_OPTIONS,
  KIGH_NONPROFIT_CREDIBILITY_STATEMENT,
} from '@/lib/constants'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { getBrowserOrigin } from '@/lib/siteOrigin'
import { isGoogleAuthEnabled } from '@/lib/featureFlags'
import { claimOrCreateMemberForAuthUser } from '@/lib/memberSync'
import { buildMembershipSignupAuthMetadata } from '@/lib/membershipAuthMetadata'
import {
  GENERAL_LOCATION_AREA_LABEL,
  GENERAL_LOCATION_AREA_VALUES,
  PROFESSIONAL_FIELD_LABEL,
  PROFESSIONAL_FIELD_VALUES,
} from '@/lib/memberDemographics'
import { logSupabaseErrorDebug, normalizeLocationProfession } from '@/lib/profilePayload'
import { sanitizePhoneInput, validatePhoneNumber } from '@/lib/phoneValidation'
import {
  mapPasswordPolicyErrorsToSignupHints,
  passwordRotationAfterChangePayload,
  validatePasswordPolicy,
} from '@/lib/passwordPolicy'

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

const MEMBERSHIP_BENEFITS = [
  {
    icon: CalendarCheck,
    title: 'Stay connected',
    body: 'Priority updates on events, gatherings, and community moments across Greater Houston.',
  },
  {
    icon: Users2,
    title: 'Belong to a community',
    body: 'Meet neighbors, build friendships, and grow with families who share your heritage.',
  },
  {
    icon: Heart,
    title: 'Welfare &amp; support',
    body: 'Lean on the community in hard seasons — bereavement, hospital visits, newcomer support.',
  },
  {
    icon: Megaphone,
    title: 'Have a voice',
    body: 'Members elect leadership, propose programs, and shape the future of KIGH.',
  },
] as const

export function MembershipPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<string[]>([])
  const [pendingAccountCreated, setPendingAccountCreated] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [membershipType, setMembershipType] = useState<MembershipType>('individual')
  const [interests, setInterests] = useState<string[]>([])
  const [agreed, setAgreed] = useState(false)
  const [consent, setConsent] = useState(false)
  const [household, setHousehold] = useState<HouseholdRow[]>([emptyHousehold()])

  const [generalLocationArea, setGeneralLocationArea] = useState('')
  const [professionalField, setProfessionalField] = useState<string>('__none__')
  const [professionalFieldOther, setProfessionalFieldOther] = useState('')

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
    const primaryPhone = validatePhoneNumber(primary.phone)
    if (!primaryPhone.ok) {
      toast.error(primaryPhone.reason)
      return
    }
    const locProf = normalizeLocationProfession({
      general_location_area: generalLocationArea,
      professional_field: professionalField,
      professional_field_other: professionalFieldOther,
    })
    if (!locProf.ok) {
      toast.error(locProf.message)
      return
    }
    if (!user) {
      if (!primary.email.trim()) {
        toast.error('Email is required')
        return
      }
      if (!password) {
        setPasswordFieldErrors(['Enter a password.'])
        toast.error('Password is required')
        return
      }
      const pv = validatePasswordPolicy(password)
      if (!pv.ok) {
        const hints = mapPasswordPolicyErrorsToSignupHints(pv.errors)
        setPasswordFieldErrors(hints)
        toast.error(pv.errors[0] ?? 'Invalid password')
        return
      }
      if (!confirmPassword) {
        setPasswordFieldErrors([])
        toast.error('Please confirm your password')
        return
      }
      if (password !== confirmPassword) {
        setPasswordFieldErrors([])
        toast.error('Passwords do not match')
        return
      }
      setPasswordFieldErrors([])
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
      for (const h of validRows) {
        const hp = validatePhoneNumber(h.phone, { allowEmpty: true })
        if (!hp.ok) {
          toast.error(hp.reason)
          return
        }
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
        phone: primaryPhone.value!,
        membership_type: membershipType,
        interests,
        household_count: householdCount,
        preferred_communication: primary.preferred_communication,
      })
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: primary.email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/membership')}`,
          data: { ...meta },
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
    const rotation = !user ? passwordRotationAfterChangePayload() : {}
    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        email: primary.email.trim().toLowerCase(),
        full_name: fullName,
        phone: primaryPhone.value,
        city: primary.city.trim() || null,
        state: primary.state.trim() || null,
        zip_code: primary.zip_code.trim() || null,
        county_or_heritage: primary.kenyan_county_or_heritage.trim() || null,
        preferred_communication: primary.preferred_communication.trim() || null,
        interests,
        updated_at: new Date().toISOString(),
        general_location_area: locProf.general_location_area,
        professional_field: locProf.professional_field,
        professional_field_other: locProf.professional_field_other,
        ...rotation,
      },
      { onConflict: 'id' }
    )
    if (profileErr) {
      logSupabaseErrorDebug('profiles.upsert.membership', profileErr)
      setLoading(false)
      toast.error('We could not save your profile. Please check the highlighted fields and try again.')
      return
    }

    const householdPayload =
      membershipType === 'family_household'
        ? household
            .filter((h) => h.full_name.trim())
            .map((h) => {
              const hp = validatePhoneNumber(h.phone, { allowEmpty: true })
              return {
                full_name: h.full_name.trim(),
                relationship: h.relationship.trim() || null,
                age_group: h.age_group || null,
                email: h.email.trim() || null,
                phone: hp.ok ? hp.value : null,
              }
            })
        : []

    const p_data = {
      first_name: primary.first_name.trim(),
      last_name: primary.last_name.trim(),
      email: primary.email.trim(),
      phone: primaryPhone.value!,
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
      general_location_area: locProf.general_location_area,
      professional_field: locProf.professional_field,
      professional_field_other: locProf.professional_field_other,
    }

    const { error } = await supabase.rpc('submit_membership_registration', { p_data })
    setLoading(false)
    if (error) {
      logSupabaseErrorDebug('rpc.submit_membership_registration', error)
      if (error.message?.includes('consent_required')) toast.error('Consent and agreement are required')
      else if (error.message?.includes('missing_required_fields')) toast.error('Please complete required fields')
      else if (error.message?.includes('authentication_required'))
        toast.error('Please sign in to submit membership.')
      else if (error.message?.includes('email_mismatch_with_signed_in_user'))
        toast.error('Email must match your signed-in account.')
      else if (error.message?.includes('member_email_registered_to_another_user'))
        toast.error('This email is already linked to another account. Contact support if you need help.')
      else if (error.message?.includes('missing_or_invalid_general_location_area'))
        toast.error('Please select a valid general Houston-area location.')
      else if (error.message?.includes('invalid_professional_field')) toast.error('Please choose a valid professional category.')
      else if (error.message?.includes('professional_field_other_required'))
        toast.error('Please describe what you do when you select Other.')
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

      <PublicPageHero
        eyebrow="Join the community"
        title="Become a member"
        subtitle="Annual dues are $20 per member (due January 31). Join as an individual, family, or associate member — the form takes a few minutes."
        primaryAction={
          <a
            href="#membership-form"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Start registration
          </a>
        }
        secondaryAction={
          <Button asChild size="sm" variant="outline">
            <Link to="/governance">Read the constitution</Link>
          </Button>
        }
        tone="tint"
      />

      {/* Benefits band */}
      <section aria-labelledby="membership-benefits-heading" className="border-b border-border/40 bg-background py-12 sm:py-14">
        <div className="public-container">
          <header className="mb-8 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              Why join
            </p>
            <h2
              id="membership-benefits-heading"
              className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              What KIGH membership looks like
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              KIGH members shape a welcoming, well-organized community for Kenyans and friends of
              Kenya across Houston.
            </p>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MEMBERSHIP_BENEFITS.map((b) => {
              const Icon = b.icon
              return (
                <div
                  key={b.title}
                  className="rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground" dangerouslySetInnerHTML={{ __html: b.title }} />
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: b.body }} />
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="membership-form" className="py-12 sm:py-16">
        <div className="public-container grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {pendingAccountCreated && (
              <Card className="border-primary/25 bg-primary/[0.04] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Check your email</CardTitle>
                  <CardDescription>
                    Confirm your email, then sign in and return here to finish agreements.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm">
                    <Link to="/login">Sign in</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Annual dues
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                $20 per year, due January 31. Dues are not billed on this site — see Support for
                payment options.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
              {!user && isGoogleAuthEnabled() ? (
                <Card className="shadow-sm border-border/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Account setup</CardTitle>
                    <CardDescription className="text-sm">
                      Google or email and password (stored by Supabase Auth).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={loading || oauthLoading}
                      onClick={() => void handleGoogleSignup()}
                    >
                      {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                    </Button>
                  </CardContent>
                </Card>
              ) : !user ? (
                <Card className="shadow-sm border-border/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Account setup</CardTitle>
                    <CardDescription className="text-sm">
                      Email and password (stored by Supabase Auth).
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : null}

              <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Your information</CardTitle>
                  <CardDescription className="text-sm">
                    Name and primary contact details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fn">First name *</Label>
                    <Input
                      id="fn"
                      required
                      value={primary.first_name}
                      onChange={(e) => setPrimary((p) => ({ ...p, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ln">Last name *</Label>
                    <Input
                      id="ln"
                      required
                      value={primary.last_name}
                      onChange={(e) => setPrimary((p) => ({ ...p, last_name: e.target.value }))}
                    />
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
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ph">Phone *</Label>
                    <Input
                      id="ph"
                      type="tel"
                      required
                      value={primary.phone}
                      onChange={(e) =>
                        setPrimary((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))
                      }
                    />
                  </div>
                  {user ? (
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Signed in as {user.email}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Contact &amp; location</CardTitle>
                  <CardDescription className="text-sm">
                    Used for community planning. Private details are not shown publicly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="a1">Address line 1</Label>
                    <Input
                      id="a1"
                      value={primary.address_line1}
                      onChange={(e) =>
                        setPrimary((p) => ({ ...p, address_line1: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      required
                      value={primary.city}
                      onChange={(e) => setPrimary((p) => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="st">State *</Label>
                    <Input
                      id="st"
                      required
                      value={primary.state}
                      onChange={(e) => setPrimary((p) => ({ ...p, state: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="zip">ZIP code *</Label>
                    <Input
                      id="zip"
                      required
                      value={primary.zip_code}
                      onChange={(e) => setPrimary((p) => ({ ...p, zip_code: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="membership-general-location">
                      General Houston-area location *
                    </Label>
                    <Select
                      value={generalLocationArea || '__none__'}
                      onValueChange={(v) => setGeneralLocationArea(v === '__none__' ? '' : v)}
                      required
                    >
                      <SelectTrigger
                        id="membership-general-location"
                        data-testid="membership-general-location"
                      >
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
                    <p
                      className="mt-1 text-xs text-muted-foreground"
                      data-testid="membership-location-helper"
                    >
                      Choose the broad area closest to you.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Community profile</CardTitle>
                  <CardDescription className="text-sm">
                    Helps us plan culturally relevant programs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="co">Kenyan county / heritage</Label>
                    <Input
                      id="co"
                      value={primary.kenyan_county_or_heritage}
                      onChange={(e) =>
                        setPrimary((p) => ({ ...p, kenyan_county_or_heritage: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Preferred communication *</Label>
                    <Select
                      value={primary.preferred_communication}
                      onValueChange={(v) =>
                        setPrimary((p) => ({ ...p, preferred_communication: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="membership-professional">What do you do?</Label>
                    <p
                      className="mb-1 text-xs text-muted-foreground"
                      data-testid="membership-profession-helper"
                    >
                      Used only for aggregate community planning.
                    </p>
                    <Select value={professionalField} onValueChange={setProfessionalField}>
                      <SelectTrigger
                        id="membership-professional"
                        data-testid="membership-professional-field"
                      >
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
                    {professionalField === 'other' ? (
                      <div className="space-y-1.5 pt-2">
                        <Label htmlFor="membership-professional-other">Other profession *</Label>
                        <Input
                          id="membership-professional-other"
                          data-testid="membership-professional-other"
                          maxLength={80}
                          value={professionalFieldOther}
                          onChange={(e) => setProfessionalFieldOther(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Interests</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {MEMBERSHIP_INTEREST_OPTIONS.map((opt) => (
                        <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!user && (
                <Card className="shadow-sm border-border/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Password *</CardTitle>
                    <CardDescription className="text-sm">
                      6–16 characters with uppercase, lowercase, number, and symbol. Stored by
                      Supabase Auth.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {passwordFieldErrors.length > 0 ? (
                      <Alert
                        variant="destructive"
                        className="py-2 sm:col-span-2"
                        data-testid="membership-password-error"
                      >
                        <AlertDescription>
                          <ul className="list-disc space-y-0.5 pl-4 text-sm">
                            {passwordFieldErrors.map((err) => (
                              <li key={err}>{err}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="pw">Password *</Label>
                      <Input
                        id="pw"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setPasswordFieldErrors([])
                        }}
                        placeholder="e.g. Abc123!"
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
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setPasswordFieldErrors([])
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={showPassword}
                          onCheckedChange={(v) => setShowPassword(v === true)}
                        />
                        Show passwords
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Membership type *</CardTitle>
                  <CardDescription className="text-sm">
                    Family households can list additional members below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={membershipType}
                    onValueChange={(v) => setMembershipType(v as MembershipType)}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual membership</SelectItem>
                      <SelectItem value="family_household">Family / household membership</SelectItem>
                      <SelectItem value="associate">Associate membership</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {membershipType === 'family_household' && (
                <Card className="border-dashed border-primary/25 bg-muted/20 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-lg">Household</CardTitle>
                      <CardDescription className="text-sm">
                        Add each member of your household.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => setHousehold((h) => [...h, emptyHousehold()])}
                    >
                      <Plus className="h-4 w-4" /> Add member
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {household.map((row, idx) => (
                      <div
                        key={idx}
                        className="relative space-y-3 rounded-xl border bg-background p-4 shadow-sm sm:p-5"
                      >
                        {household.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setHousehold((h) => h.filter((_, i) => i !== idx))}
                            aria-label="Remove household member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label>Full name *</Label>
                            <Input
                              value={row.full_name}
                              onChange={(e) =>
                                updateHousehold(idx, { full_name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Relationship</Label>
                            <Input
                              value={row.relationship}
                              onChange={(e) =>
                                updateHousehold(idx, { relationship: e.target.value })
                              }
                              placeholder="e.g. Spouse, Child"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Age group</Label>
                            <Select
                              value={row.age_group || 'none'}
                              onValueChange={(v) =>
                                updateHousehold(idx, {
                                  age_group:
                                    v === 'none' ? '' : (v as HouseholdRow['age_group']),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
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
                            <Input
                              type="email"
                              value={row.email}
                              onChange={(e) =>
                                updateHousehold(idx, { email: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Phone</Label>
                            <Input
                              type="tel"
                              value={row.phone}
                              onChange={(e) =>
                                updateHousehold(idx, {
                                  phone: sanitizePhoneInput(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm border-border/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Consent *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                    <Checkbox
                      checked={agreed}
                      onCheckedChange={(v) => setAgreed(v === true)}
                      className="mt-1"
                    />
                    <span>
                      I agree to follow the KIGH{' '}
                      <Link
                        to="/governance"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Constitution, Bylaws, and Code of Conduct
                      </Link>
                      .
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                    <Checkbox
                      checked={consent}
                      onCheckedChange={(v) => setConsent(v === true)}
                      className="mt-1"
                    />
                    <span>
                      I consent to KIGH using my information for membership administration and
                      community communication.
                    </span>
                  </label>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full min-w-[14rem] font-semibold sm:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit registration'}
                </Button>
                <p className="text-xs text-muted-foreground sm:max-w-sm">
                  By submitting, you confirm the information above and agree to the constitution
                  and consent statements.
                </p>
              </div>
            </form>
          </div>

          {/* Trust sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                Trust &amp; privacy
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                Your information is protected
              </h2>
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    Phone, address, and household details are never shown publicly. Only
                    membership status and aggregated stats are.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                  <span>
                    Members can update or delete their profile at any time after signing in.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5 text-xs text-muted-foreground leading-relaxed">
              <p>{KIGH_NONPROFIT_CREDIBILITY_STATEMENT}</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
