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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Community Support</h1>
          <p className="text-muted-foreground">Fundraisers and support drives from our community</p>
        </div>

        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            {FUNDRAISER_DISCLAIMER}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search fundraisers…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={category === '' ? 'default' : 'outline'} size="sm" onClick={() => setCategory('')}>All</Button>
            {FUNDRAISER_CATEGORIES.map((cat) => (
              <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategory(cat)}>{cat}</Button>
            ))}
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${items.length} fundraiser${items.length !== 1 ? 's' : ''}`}</p>
          <Button asChild size="sm"><Link to="/submit/fundraiser">Submit Fundraiser</Link></Button>
        </div>

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
