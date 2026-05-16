import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Search, AlertTriangle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { FundraiserCard } from '@/components/FundraiserCard'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { FUNDRAISER_CATEGORIES } from '@/lib/constants'
import { FUNDRAISER_DISCLAIMER } from '@/lib/constants'
import type { Fundraiser } from '@/lib/types'

export function CommunitySupportPage() {
  const [items, setItems] = useState<Fundraiser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('fundraisers')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (category) query = query.eq('category', category)
      if (search) query = query.ilike('title', `%${search}%`)

      const { data } = await query
      setItems((data as Fundraiser[]) ?? [])
      setLoading(false)
    }
    load()
  }, [search, category])

  return (
    <>
      <SEOHead title="Community Support" description="Fundraisers and community support campaigns from the Kenyan community in Houston." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Community support
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground">
              Fundraisers and welfare drives neighbors are rallying around.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/community-support/submit">Submit a fundraiser</Link>
          </Button>
        </div>

        <Alert className="mb-8 border-amber-200/80 bg-amber-50/70">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm leading-relaxed">
            {FUNDRAISER_DISCLAIMER}
          </AlertDescription>
        </Alert>

        <div className="mb-8 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fundraisers…"
              className="h-11 pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={category === '' ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => setCategory('')}>All</Button>
            {FUNDRAISER_CATEGORIES.map((cat) => (
              <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => setCategory(cat)}>{cat}</Button>
            ))}
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${items.length} fundraiser${items.length !== 1 ? 's' : ''}`}
        </p>

        {loading ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={Heart} title="No fundraisers found" description="Check back soon or submit a community fundraiser." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f) => <FundraiserCard key={f.id} fundraiser={f} />)}
          </div>
        )}
      </div>
    </>
  )
}
