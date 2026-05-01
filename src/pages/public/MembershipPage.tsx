import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed || !consent) {
      toast.error('Please confirm both required checkboxes')
      return
    }
    if (membershipType === 'family_household') {
      const validRows = household.filter((h) => h.full_name.trim())
      if (validRows.length === 0) {
        toast.error('Add at least one household member with a full name')
        return
      }
    }
    setLoading(true)
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
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <KighLogo withCard className="h-20 w-20 shrink-0" imgClassName="max-h-[4.5rem]" />
          <div>
            <h1 className="text-3xl font-bold">Membership Registration</h1>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Join the Kenyan community in Greater Houston. Register as an individual, family, or associate member and stay connected to events, resources, and community support.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Annual dues</CardTitle>
            <CardDescription>
              Annual membership dues are <strong className="text-foreground">$20</strong>, due by <strong className="text-foreground">January 31</strong> each year. Payment is not collected on this website yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground border-t pt-4">
            Membership dues are $20 annually and due by January 31. Payment instructions are available on the{' '}
            <Link to="/support" className="text-primary font-medium underline-offset-4 hover:underline">
              Support KIGH
            </Link>{' '}
            page.
          </CardContent>
        </Card>

        <form onSubmit={onSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Primary member information</CardTitle>
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
                <Input id="em" type="email" required value={primary.email} onChange={(e) => setPrimary((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ph">Phone</Label>
                <Input id="ph" type="tel" value={primary.phone} onChange={(e) => setPrimary((p) => ({ ...p, phone: e.target.value }))} />
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

          <Card>
            <CardHeader>
              <CardTitle>Membership type *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={membershipType} onValueChange={(v) => setMembershipType(v as MembershipType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual membership</SelectItem>
                  <SelectItem value="family_household">Family / household membership</SelectItem>
                  <SelectItem value="associate">Associate membership</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {membershipType === 'family_household' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Family / household members</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setHousehold((h) => [...h, emptyHousehold()])}
                >
                  <Plus className="h-4 w-4" /> Add member
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {household.map((row, idx) => (
                  <div key={idx} className="rounded-lg border p-4 space-y-3 relative">
                    {household.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-destructive"
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
                        <Input value={row.relationship} onChange={(e) => updateHousehold(idx, { relationship: e.target.value })} />
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

          <Card>
            <CardHeader>
              <CardTitle>Community interest areas</CardTitle>
              <CardDescription>Select all that apply.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {MEMBERSHIP_INTEREST_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
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

          <Card>
            <CardContent className="pt-6 space-y-4">
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  I agree to follow the KIGH{' '}
                  <Link to="/governance" className="text-primary font-medium underline-offset-4 hover:underline">
                    Constitution, Bylaws, and Code of Conduct
                  </Link>
                  . *
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>
                  I consent to KIGH using my information for membership administration and community communication. *
                </span>
              </label>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit registration'}
          </Button>
        </form>
      </div>
    </>
  )
}
