import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UsersRound, Search, MapPin, Mail, Phone, ExternalLink, Share2, BadgeCheck } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { CommunityGroupPublic } from '@/lib/types'
import { COMMUNITY_GROUP_CATEGORIES } from '@/lib/constants'
import { PageLoader } from '@/components/LoadingSpinner'

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

  return (
    <>
      <SEOHead
        title="Community Groups & Institutions"
        description="Religious institutions, benevolence groups, welfare groups, and community organizations serving Kenyans and friends of Kenya in Greater Houston."
      />

      <div className="border-b bg-gradient-to-br from-primary/[0.07] via-background to-muted/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 max-w-3xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <UsersRound className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Community Groups & Institutions</h1>
                <p className="mt-3 text-muted-foreground text-base sm:text-lg leading-relaxed">
                  Find religious institutions, benevolence groups, welfare groups, and community organizations serving Kenyans and friends of Kenya in Greater Houston.
                </p>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0 self-start sm:self-center">
              <Link to="/community-groups/submit">Submit a Group / Institution</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-11 bg-background"
            placeholder="Search by name, description, service area, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={category === FILTER_ALL ? 'default' : 'outline'} onClick={() => setCategory(FILTER_ALL)} className="rounded-full">
            All
          </Button>
          {COMMUNITY_GROUP_CATEGORIES.map((c) => (
            <Button key={c.value} size="sm" variant={category === c.value ? 'default' : 'outline'} onClick={() => setCategory(c.value)} className="rounded-full">
              {c.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <PageLoader />
        ) : groups.length === 0 ? (
          <Card className="border-dashed bg-muted/15">
            <CardContent className="py-14 text-center px-4">
              <UsersRound className="mx-auto h-11 w-11 text-primary/30 mb-3" />
              <p className="font-medium text-foreground text-lg">No community groups listed yet.</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                If your organization serves the Kenyan community in Greater Houston, submit it for review.
              </p>
              <Button asChild className="mt-6">
                <Link to="/community-groups/submit">Submit a Group / Institution</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {groups.map((g) => (
              <Card key={g.id} className="flex flex-col border-border/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-snug pr-2">{g.organization_name}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {categoryLabel(g.category)}
                      </Badge>
                      {g.is_verified ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal">
                          Community submitted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-xs font-medium uppercase tracking-wide text-primary/80">Greater Houston</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  {g.description ? <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">{g.description}</p> : null}
                  <div className="text-sm text-muted-foreground space-y-1.5">
                    {g.meeting_location ? (
                      <p className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                        <span>{g.meeting_location}</span>
                      </p>
                    ) : null}
                    {g.service_area ? (
                      <p className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                        <span>Service area: {g.service_area}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 mt-auto">
                    {g.website_url ? (
                      <Button asChild size="sm" className="gap-1.5">
                        <a href={g.website_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> Visit Website
                        </a>
                      </Button>
                    ) : null}
                    {g.public_email || g.public_phone ? (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <a
                          href={
                            g.public_email
                              ? `mailto:${g.public_email}`
                              : `tel:${(g.public_phone ?? '').replace(/[^\d+]/g, '')}`
                          }
                        >
                          {g.public_email ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                          Contact
                        </a>
                      </Button>
                    ) : null}
                    {g.social_url ? (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <a href={g.social_url} target="_blank" rel="noopener noreferrer">
                          <Share2 className="h-3.5 w-3.5" /> Social
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed border-t pt-8">
          Listings are provided for community information. KIGH does not control the activities, policies, or services of listed organizations. Please contact each organization directly for current details.
        </p>
      </div>
    </>
  )
}
