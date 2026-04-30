import { Link } from 'react-router-dom'
import { Trophy, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/utils'
import type { SportsPost } from '@/lib/types'

interface SportsCardProps {
  post: SportsPost
}

export function SportsCard({ post }: SportsCardProps) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link to={`/sports-youth/${post.slug}`}>
        <div className="relative h-40 bg-muted overflow-hidden">
          {post.image_url ? (
            <img
              src={post.image_url}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-kenyan-gold-50">
              <Trophy className="h-12 w-12 text-primary/30" />
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="mb-1.5 flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">{post.category}</Badge>
            {post.sport && <Badge variant="outline" className="text-xs">{post.sport}</Badge>}
          </div>
          <h3 className="font-semibold text-base leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{post.summary}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{post.author_name}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.published_at ? timeAgo(post.published_at) : 'Recent'}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
