import { useEffect, useMemo, useState } from 'react'
import { FileText, ExternalLink, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/types'
import { RESOURCE_LIBRARY_CATEGORIES } from '@/lib/constants'
import { PageLoader } from '@/components/LoadingSpinner'

function fileHref(url: string): string {
  return url.startsWith('http') ? url : encodeURI(url)
}

function typeBadge(fileType: string | null): string {
  if (!fileType) return 'File'
  return fileType.toUpperCase()
}

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Explicit columns only — never request storage_bucket / storage_path / mime_type on public pages.
      let q = supabase
        .from('resources')
        .select(
          'id, title, slug, description, category, file_type, file_url, external_url, access_level, status, resource_date, related_event_id, created_at, updated_at'
        )
        .eq('status', 'published')
        .eq('access_level', 'public')
        .order('title', { ascending: true })
      if (category) q = q.eq('category', category)
      const { data } = await q
      setResources((data as Resource[]) ?? [])
      setLoading(false)
    }
    load()
  }, [category])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return resources
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(s) ||
        (r.description?.toLowerCase().includes(s) ?? false)
    )
  }, [resources, search])

  return (
    <>
      <SEOHead
        title="Resource Library"
        description="Public KIGH documents, presentations, and community resources."
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            Public reference shelf
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Resource library
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Governance documents, presentation handouts from past KIGH sessions, member forms, and
            other materials published for the community. Use the search and filters to find what
            you need without scrolling through everything.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-11 bg-background"
              placeholder="Search resources…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={category === '' ? 'default' : 'outline'} onClick={() => setCategory('')} className="rounded-full">
              All
            </Button>
            {RESOURCE_LIBRARY_CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => setCategory(c)} className="rounded-full">
                {c}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-8 py-14 text-center">
            <FileText className="mx-auto h-10 w-10 text-primary/35 mb-3" />
            <p className="font-medium text-foreground">No resources match your search</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Try another category or clear the search. Governance and presentation files appear here when published as public.
            </p>
            <Button variant="outline" size="sm" className="mt-5" onClick={() => { setSearch(''); setCategory('') }}>
              Reset filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filtered.map((r) => {
              const href = r.external_url || r.file_url
              const external = !!r.external_url
              return (
                <Card key={r.id} className="flex flex-col border-border/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg leading-snug pr-2">{r.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0 font-mono text-[10px] uppercase tracking-wide">
                        {typeBadge(r.file_type)}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs font-medium uppercase tracking-wide text-primary/80">
                      {r.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end space-y-3 pt-0">
                    {r.description && <p className="text-sm text-muted-foreground line-clamp-3">{r.description}</p>}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      {r.resource_date && <span>Updated: {r.resource_date}</span>}
                    </div>
                    {href && (
                      <Button asChild size="sm" className="w-full gap-2 font-medium">
                        <a href={fileHref(href)} target="_blank" rel="noopener noreferrer">
                          {external ? <ExternalLink className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          {external ? 'Open link' : 'View / download'}
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
