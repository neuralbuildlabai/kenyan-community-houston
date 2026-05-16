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
  ArrowUpRight,
} from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PublicPageHero } from '@/components/public/PublicPageHero'
import { PublicSection } from '@/components/public/PublicSection'
import { EmptyState } from '@/components/EmptyState'
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
        subtitle="Churches, associations, benevolence and welfare groups, cultural organizations, and nonprofits serving Kenyans and friends of Kenya across Greater Houston."
        primaryAction={
          <Button asChild size="sm">
            <Link to="/community-groups/submit">Submit a group</Link>
          </Button>
        }
        tone="tint"
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
      <section className="sticky top-16 z-20 border-b border-border/50 bg-background/85 backdrop-blur">
        <div className="public-container py-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-11 bg-background"
              placeholder="Search by name, description, service area, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search community groups"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
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
                  <Link to="/community-groups/submit">Submit a group / institution</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {groups.map((g) => (
              <GroupRow key={g.id} group={g} />
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
    </>
  )
}

function GroupRow({ group: g }: { group: CommunityGroupPublic }) {
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
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {g.description}
          </p>
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
