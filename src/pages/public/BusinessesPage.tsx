import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Search } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { BusinessCard } from '@/components/BusinessCard'
import { EmptyState } from '@/components/EmptyState'
import { PageLoader } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { BUSINESS_CATEGORIES } from '@/lib/constants'
import type { Business } from '@/lib/types'

export function BusinessesPage() {
  const [items, setItems] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('businesses')
        .select('*')
        .eq('status', 'published')
        .order('tier', { ascending: false })
        .order('name', { ascending: true })

      if (category) query = query.eq('category', category)
      if (search) query = query.ilike('name', `%${search}%`)

      const { data } = await query
      setItems((data as Business[]) ?? [])
      setLoading(false)
    }
    load()
  }, [search, category])

  return (
    <>
      <SEOHead title="Business Directory" description="Find Kenyan-owned and community-friendly businesses in Houston." />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Directory</h1>
          <p className="text-muted-foreground">Discover Kenyan-owned and community-friendly businesses in Houston</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search businesses…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={category === '' ? 'default' : 'outline'} size="sm" onClick={() => setCategory('')}>All</Button>
            {BUSINESS_CATEGORIES.map((cat) => (
              <Button key={cat} variant={category === cat ? 'default' : 'outline'} size="sm" onClick={() => setCategory(cat)}>{cat}</Button>
            ))}
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${items.length} business${items.length !== 1 ? 'es' : ''}`}</p>
          <Button asChild size="sm"><Link to="/submit/business">List Your Business</Link></Button>
        </div>

        {loading ? <PageLoader /> : items.length === 0 ? (
          <EmptyState icon={Building2} title="No businesses found" description="Try a different search or be the first to list yours." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => <BusinessCard key={b.id} business={b} />)}
          </div>
        )}
      </div>
    </>
  )
}
