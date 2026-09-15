import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type FilterOption = { value: string; label: string }

type PublicFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  searchLabel: string
  /** Value of the "All" chip — '' on most pages. */
  allValue?: string
  category: string
  onCategoryChange: (value: string) => void
  options: readonly FilterOption[]
}

/**
 * Search box + category chips shared by the public directory pages.
 *
 * Mobile: the bar scrolls away with the page and the chips sit on one
 * horizontally scrollable row. Pinning it with `sticky` while the chips wrapped
 * made it taller than a phone screen (24 business categories ≈ 10 rows), so the
 * listings scrolled uselessly underneath it. From `sm` up there is room, so it
 * stays pinned with wrapping chips.
 */
export function PublicFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  allValue = '',
  category,
  onCategoryChange,
  options,
}: PublicFilterBarProps) {
  const chips: FilterOption[] = [{ value: allValue, label: 'All' }, ...options]

  return (
    <section className="border-b border-border/50 bg-background/85 backdrop-blur sm:sticky sm:top-16 sm:z-20">
      <div className="public-container py-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="h-11 pl-9 bg-background"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={searchLabel}
          />
        </div>
        <div
          className={cn(
            // Bleed the scroll row to the screen edges on mobile so chips don't
            // look clipped by the container padding.
            '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0'
          )}
          role="tablist"
          aria-label="Filter by category"
        >
          {chips.map((chip) => (
            <Button
              key={chip.value || '__all'}
              variant={category === chip.value ? 'default' : 'outline'}
              size="sm"
              className="rounded-full h-8 px-3.5 shrink-0 whitespace-nowrap"
              onClick={() => onCategoryChange(chip.value)}
              role="tab"
              aria-selected={category === chip.value}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
