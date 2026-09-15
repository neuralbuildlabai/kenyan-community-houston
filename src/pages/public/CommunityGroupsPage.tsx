import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UsersRound,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Share2,
  BadgeCheck,
  ArrowUpRight,
  UserPlus,
  CheckCircle2,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicFilterBar } from '@/components/public/PublicFilterBar'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
import { supabase } from '@/lib/supabase'
import type { CommunityGroupPublic } from '@/lib/types'
import { COMMUNITY_GROUP_CATEGORIES } from '@/lib/constants'
import { PageLoader } from '@/components/LoadingSpinner'
import { MapLink } from '@/components/MapLink'
import { safeExternalHref, prettyExternalLabel } from '@/lib/externalUrl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { sanitizePhoneInput, validatePhoneNumber } from '@/lib/phoneValidation'
import { trackSubmissionCreated } from '@/lib/analytics'
import { JOIN_MESSAGE_MAX, joinRequestErrorMessage, validateJoinRequestInput } from '@/lib/communityGroupJoin'
import { toast } from 'sonner'

const FILTER_ALL = 'all'

function categoryLabel(value: string): string {
  return COMMUNITY_GROUP_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export function CommunityGroupsPage() {
  const [groups, setGroups] = useState<CommunityGroupPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<string>(FILTER_ALL)
  const [joinGroup, setJoinGroup] = useState<CommunityGroupPublic | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 320)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.rpc('list_public_community_groups', {
        p_category: category === FILTER_ALL ? null : category,
        p_search: debouncedSearch || null,
      })
      if (error) {
        setGroups([])
      } else {
        setGroups((data as CommunityGroupPublic[]) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [category, debouncedSearch])

  const totalCount = groups.length
  const filterIsActive = category !== FILTER_ALL || debouncedSearch.length > 0
  const verifiedCount = useMemo(() => groups.filter((g) => g.is_verified).length, [groups])

  return (
    <>
      <SEOHead
        title="Community Groups & Institutions"
        description="Religious institutions, benevolence groups, welfare groups, and community organizations serving Kenyans and friends of Kenya in Greater Houston."
      />

      <PublicPageHero
        eyebrow="Trusted directory"
        title="Community groups &amp; institutions"
        subtitle="Churches, associations, benevolence and welfare circles, youth and family groups, cultural organizations, and nonprofits serving Kenyans and friends of Kenya across Greater Houston. Non-commercial listings — reviewed before publication."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/community-groups/submit">Register a group</Link>
          </Button>
        }
        tone="sage"
      />

      {/* Editorial intro / counts */}
      <section className="border-b border-border/40 bg-background">
        <div className="public-container py-6 sm:py-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{loading ? '—' : totalCount}</span>{' '}
              {filterIsActive ? 'matching listings' : 'listings'}
            </span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>
              <span className="font-semibold text-foreground">{loading ? '—' : verifiedCount}</span>{' '}
              verified
            </span>
            <span aria-hidden className="text-muted-foreground/40 hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Listings are community-provided and reviewed before publication.
            </span>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <PublicFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, description, service area, or location…"
        searchLabel="Search community groups"
        allValue={FILTER_ALL}
        category={category}
        onCategoryChange={setCategory}
        options={COMMUNITY_GROUP_CATEGORIES}
      />

      <PublicSection className="!py-10 sm:!py-12 lg:!py-14">
        {loading ? (
          <PageLoader />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={
              filterIsActive
                ? 'No groups match your filters yet'
                : 'No community groups listed yet'
            }
            description={
              filterIsActive
                ? 'Try a different category or clear the search. New listings are added as the community submits and we verify them.'
                : 'If your organization serves the Kenyan community in Greater Houston, submit it for review.'
            }
            action={
              filterIsActive ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCategory(FILTER_ALL)
                    setSearch('')
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/community-groups/submit">Register a group or institution</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {groups.map((g) => (
              <GroupRow key={g.id} group={g} onRequestJoin={setJoinGroup} />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-14 max-w-3xl mx-auto rounded-2xl border border-border/50 bg-muted/30 px-5 py-5 text-xs text-muted-foreground leading-relaxed">
          <p>
            <span className="font-semibold text-foreground">Listings are community-provided.</span>{' '}
            KIGH does not control the activities, policies, or services of the organizations listed
            here. Please contact each organization directly for current details, schedules, and
            membership terms.
          </p>
        </div>
      </PublicSection>

      <JoinGroupDialog group={joinGroup} onClose={() => setJoinGroup(null)} />
    </>
  )
}

function GroupRow({
  group: g,
  onRequestJoin,
}: {
  group: CommunityGroupPublic
  onRequestJoin: (group: CommunityGroupPublic) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const websiteHref = safeExternalHref(g.website_url)
  const websiteLabel = g.website_url ? prettyExternalLabel(g.website_url) : null
  const socialHref = safeExternalHref(g.social_url)
  const contactHref = g.public_email
    ? `mailto:${g.public_email}`
    : g.public_phone
      ? `tel:${g.public_phone.replace(/[^\d+]/g, '')}`
      : null

  return (
    <article className="group rounded-2xl border border-border/60 bg-card transition-all hover:border-primary/40 hover:shadow-[0_8px_40px_-20px_hsl(222_28%_12%/0.25)] overflow-hidden">
      <div
        className="h-1 w-full bg-gradient-to-r from-primary/70 via-kenyan-gold-500/70 to-primary/70 opacity-70"
        aria-hidden
      />
      <div className="p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[11px] font-medium">
                {categoryLabel(g.category)}
              </Badge>
              {g.is_verified ? (
                <Badge variant="default" className="gap-1 text-[11px]">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </Badge>
              ) : null}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              {g.organization_name}
            </h3>
            {g.contact_person ? (
              <p className="mt-0.5 text-xs text-muted-foreground">Contact: {g.contact_person}</p>
            ) : null}
          </div>
          {websiteHref ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${g.organization_name} website`}
              title={websiteLabel ?? undefined}
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
            >
              Visit website
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </header>

        {g.description ? (
          <div className="mt-3">
            <p
              className={`text-sm leading-relaxed text-muted-foreground whitespace-pre-line ${expanded ? '' : 'line-clamp-3'}`}
            >
              {g.description}
            </p>
            {g.description.length > 180 ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs font-medium text-primary hover:underline"
                aria-expanded={expanded}
              >
                {expanded ? 'Show less' : 'Read more & how to join'}
              </button>
            ) : null}
          </div>
        ) : null}

        {(g.meeting_location || g.service_area) ? (
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {g.meeting_location ? (
              <div className="space-y-0.5">
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                  <span className="leading-snug">{g.meeting_location}</span>
                </p>
                <MapLink
                  address={g.meeting_location}
                  location={g.organization_name}
                  className="text-xs pl-6"
                />
              </div>
            ) : null}
            {g.service_area ? (
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/40" />
                <span className="leading-snug">Service area: {g.service_area}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => onRequestJoin(g)}>
            <UserPlus className="h-3.5 w-3.5" />
            Request to join
          </Button>
          {websiteHref ? (
            <Button asChild size="sm" variant="outline" className="sm:hidden gap-1.5">
              <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Website
              </a>
            </Button>
          ) : null}
          {contactHref ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={contactHref}>
                {g.public_email ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                Contact
              </a>
            </Button>
          ) : null}
          {socialHref ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={socialHref} target="_blank" rel="noopener noreferrer">
                <Share2 className="h-3.5 w-3.5" />
                Social
              </a>
            </Button>
          ) : null}
          {websiteLabel ? (
            <span className="ml-auto truncate text-[11px] text-muted-foreground/80 max-w-[14rem]">
              {websiteLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

type JoinForm = { name: string; email: string; phone: string; message: string }

function JoinGroupDialog({ group, onClose }: { group: CommunityGroupPublic | null; onClose: () => void }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState<JoinForm>({ name: '', email: '', phone: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ duplicate: boolean } | null>(null)

  // Reset per group, prefilling from the signed-in account when there is one.
  useEffect(() => {
    if (!group) return
    setSent(null)
    setForm({
      name: profile?.full_name ?? '',
      email: profile?.email ?? user?.email ?? '',
      phone: '',
      message: '',
    })
  }, [group, profile, user])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!group) return
    const problem = validateJoinRequestInput(form)
    if (problem) {
      toast.error(problem)
      return
    }
    const phoneRes = validatePhoneNumber(form.phone, { allowEmpty: true })
    if (!phoneRes.ok) {
      toast.error(phoneRes.reason)
      return
    }
    setSending(true)
    const { data, error } = await supabase.rpc('submit_community_group_join_request', {
      p_group_id: group.id,
      p_name: form.name.trim(),
      p_email: form.email.trim(),
      p_phone: form.phone.trim() || null,
      p_message: form.message.trim() || null,
    })
    setSending(false)
    if (error) {
      toast.error(joinRequestErrorMessage(error.message))
      return
    }
    const row = Array.isArray(data) ? data[0] : data
    const duplicate = Boolean(row?.already_requested)
    if (!duplicate) void trackSubmissionCreated('community_group_join')
    setSent({ duplicate })
  }

  const socialHref = group ? safeExternalHref(group.social_url) : null

  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {sent ? 'Request sent' : `Request to join ${group?.organization_name ?? ''}`}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4 text-sm">
            <p className="flex items-start gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <span>
                {sent.duplicate
                  ? `You already have an open request for ${group?.organization_name}. We'll make sure it reaches them.`
                  : `Thanks! KIGH admins have been notified and will pass your details to ${group?.organization_name}'s contact person, who will reach out to you directly.`}
              </span>
            </p>
            {socialHref ? (
              <p className="text-muted-foreground">
                Want to connect sooner?{' '}
                <a href={socialHref} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                  Visit the group's social page
                </a>
                .
              </p>
            ) : null}
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share your details and KIGH will pass them to the group's contact person. Groups manage their own
              membership, so they'll follow up with you directly.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="join-name">Your name <span className="text-destructive">*</span></Label>
              <Input id="join-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="join-email">Email <span className="text-destructive">*</span></Label>
              <Input id="join-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="join-phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="join-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="join-message">Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="join-message"
                rows={4}
                maxLength={JOIN_MESSAGE_MAX}
                placeholder="A little about yourself or what draws you to this group"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
              <Button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send request'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
