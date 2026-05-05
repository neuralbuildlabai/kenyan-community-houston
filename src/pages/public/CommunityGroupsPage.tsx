import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UsersRound,
  Search,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Share2,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { CommunityGroupPublic } from '@/lib/types'
import { COMMUNITY_GROUP_CATEGORIES } from '@/lib/constants'
import { PageLoader } from '@/components/LoadingSpinner'
import { MapLink } from '@/components/MapLink'
import { safeExternalHref, prettyExternalLabel } from '@/lib/externalUrl'

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

  // Pre-compute derived counts for the filter chips so we can show
  // category totals without a second round-trip.
  const totalCount = groups.length
  const filterIsActive = category !== FILTER_ALL || debouncedSearch.length > 0

  const verifiedCount = useMemo(
    () => groups.filter((g) => g.is_verified).length,
    [groups]
  )

  return (
    <>
      <SEOHead
        title="Community Groups & Institutions"
        description="Religious institutions, benevolence groups, welfare groups, and community organizations serving Kenyans and friends of Kenya in Greater Houston."
      />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative border-b bg-gradient-to-br from-primary/[0.08] via-background to-kenyan-gold-50/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <UsersRound className="h-3.5 w-3.5" />
                Greater Houston
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
                Community Groups &{' '}
                <span className="text-primary">Institutions</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                A non-commercial directory of religious institutions, benevolence
                and welfare circles, youth and family groups, cultural
                organizations, and professional networks that serve Kenyans and
                friends of Kenya across Greater Houston.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="shadow-sm">
                  <Link to="/community-groups/submit" className="gap-1.5">
                    Submit a group
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="gap-1.5">
                  <Link to="/contact">Contact KIGH</Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex items-end justify-end">
              <div className="rounded-2xl border bg-white/60 backdrop-blur-sm px-6 py-5 shadow-sm w-full max-w-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  At a glance
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-foreground">
                      {loading ? '—' : totalCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {filterIsActive ? 'matching' : 'listings'}
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">
                      {loading ? '—' : verifiedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">verified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Toolbar (search + chips) ─────────────────────────── */}
      <section className="sticky top-16 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-11 bg-background"
              placeholder="Search by name, description, service area, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search community groups"
            />
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter by category"
          >
            <Button
              size="sm"
              variant={category === FILTER_ALL ? 'default' : 'outline'}
              onClick={() => setCategory(FILTER_ALL)}
              className="rounded-full h-8 px-3.5"
              role="tab"
              aria-selected={category === FILTER_ALL}
            >
              All
            </Button>
            {COMMUNITY_GROUP_CATEGORIES.map((c) => (
              <Button
                key={c.value}
                size="sm"
                variant={category === c.value ? 'default' : 'outline'}
                onClick={() => setCategory(c.value)}
                className="rounded-full h-8 px-3.5"
                role="tab"
                aria-selected={category === c.value}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Listings ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {loading ? (
          <PageLoader />
        ) : groups.length === 0 ? (
          <Card className="border-dashed bg-muted/15 max-w-2xl mx-auto">
            <CardContent className="py-16 text-center px-6">
              <UsersRound className="mx-auto h-12 w-12 text-primary/30 mb-4" />
              <h2 className="font-semibold text-foreground text-xl">
                {filterIsActive
                  ? 'No groups match your filters yet'
                  : 'No community groups listed yet'}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                {filterIsActive
                  ? 'Try a different category or clear the search box. New listings are added as the community submits and we verify them.'
                  : 'If your organization serves the Kenyan community in Greater Houston, submit it for review.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {filterIsActive ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCategory(FILTER_ALL)
                      setSearch('')
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
                <Button asChild>
                  <Link to="/community-groups/submit">Submit a Group / Institution</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        )}

        {/* ─── Disclaimer ─────────────────────────────────────── */}
        <div className="mt-14 sm:mt-16 max-w-3xl mx-auto rounded-xl border bg-muted/30 px-5 py-4 text-xs text-muted-foreground leading-relaxed">
          <p>
            <span className="font-semibold text-foreground">Listings are
            community-provided.</span>{' '}
            KIGH does not control the activities, policies, or services of the
            organizations listed here. Please contact each organization
            directly for current details, schedules, and membership terms.
          </p>
        </div>
      </section>
    </>
  )
}

function GroupCard({ group: g }: { group: CommunityGroupPublic }) {
  // Defensive read-side URL normalization. Newly-submitted rows are
  // already normalized server-side via `normalizeExternalUrl` in
  // the submit / admin flows; this handles legacy rows that may
  // have been stored without a protocol.
  const websiteHref = safeExternalHref(g.website_url)
  const websiteLabel = g.website_url ? prettyExternalLabel(g.website_url) : null
  const socialHref = safeExternalHref(g.social_url)
  const contactHref = g.public_email
    ? `mailto:${g.public_email}`
    : g.public_phone
      ? `tel:${g.public_phone.replace(/[^\d+]/g, '')}`
      : null

  return (
    <Card className="group flex h-full flex-col border-border/80 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all overflow-hidden">
      {/* Top accent bar — subtle premium cue */}
      <div
        className="h-1 w-full bg-gradient-to-r from-primary/70 via-kenyan-gold-500/70 to-primary/70 opacity-80"
        aria-hidden
      />
      <div className="flex h-full flex-col p-5 sm:p-6 gap-4">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <Badge variant="secondary" className="text-[11px] font-medium">
              {categoryLabel(g.category)}
            </Badge>
            {g.is_verified ? (
              <Badge variant="default" className="gap-1 text-[11px]">
                <BadgeCheck className="h-3 w-3" /> Verified
              </Badge>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {g.organization_name}
          </h3>
          {g.contact_person ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Contact: {g.contact_person}
            </p>
          ) : null}
        </div>

        {g.description ? (
          <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
            {g.description}
          </p>
        ) : null}

        <div className="text-sm text-muted-foreground space-y-1.5">
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
              <span className="leading-snug">
                Service area: {g.service_area}
              </span>
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {websiteHref ? (
            <Button asChild size="sm" className="gap-1.5">
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit ${g.organization_name} website`}
                title={websiteLabel ?? undefined}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit website
              </a>
            </Button>
          ) : null}
          {contactHref ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={contactHref}>
                {g.public_email ? (
                  <Mail className="h-3.5 w-3.5" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
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
        </div>

        {websiteLabel ? (
          <p className="text-[11px] text-muted-foreground/80 truncate">
            {websiteLabel}
          </p>
        ) : null}
      </div>
    </Card>
  )
}
