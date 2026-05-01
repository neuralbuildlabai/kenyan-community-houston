import { useEffect, useMemo, useState } from 'react'
import { FileText, ExternalLink, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/types'
import { RESOURCE_LIBRARY_CATEGORIES } from '@/lib/constants'
import { PageLoader } from '@/components/LoadingSpinner'

function fileHref(url: string): string {
  return url.startsWith('http') ? url : encodeURI(url)
}

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase
        .from('resources')
        .select('*')
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
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Resource library</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl leading-relaxed">
            Browse published KIGH resources. Sensitive or internal materials are not listed here.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by title or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={category === '' ? 'default' : 'outline'} onClick={() => setCategory('')}>
            All categories
          </Button>
          {RESOURCE_LIBRARY_CATEGORIES.map((c) => (
            <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => setCategory(c)}>
              {c}
            </Button>
          ))}
        </div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No resources match your filters yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((r) => {
              const href = r.external_url || r.file_url
              const external = !!r.external_url
              return (
                <Card key={r.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{r.title}</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                    <CardDescription className="text-xs uppercase tracking-wide">{r.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end space-y-3">
                    {r.description && <p className="text-sm text-muted-foreground line-clamp-3">{r.description}</p>}
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                      {r.file_type && <span>Type: {r.file_type}</span>}
                      {r.resource_date && <span>Date: {r.resource_date}</span>}
                    </div>
                    {href && (
                      <Button asChild size="sm" variant="secondary" className="w-full gap-2">
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
