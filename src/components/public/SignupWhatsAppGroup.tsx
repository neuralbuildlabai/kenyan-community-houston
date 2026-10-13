import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

/**
 * "Join the WhatsApp group" button for the volunteer/vendor thank-you
 * screens. The link is admin-only (migration 087); the RPC returns it only
 * when a signup for this event + phone exists, so renders nothing for events
 * without a group or before the migration is applied.
 */
export function SignupWhatsAppGroup({ eventId, phone }: { eventId: string; phone: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void supabase
      .rpc('event_whatsapp_group_for_signup', { p_event_id: eventId, p_phone: phone })
      .then(({ data, error }) => {
        if (!cancelled && !error && typeof data === 'string' && data) setUrl(data)
      })
    return () => {
      cancelled = true
    }
  }, [eventId, phone])

  if (!url) return null

  return (
    <div
      className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 p-3 space-y-2"
      data-testid="signup-whatsapp-group"
    >
      <p className="text-sm font-semibold text-foreground">Join the event WhatsApp group</p>
      <p className="text-xs text-muted-foreground">
        Updates, setup details, and last-minute changes are shared here first.
      </p>
      <Button asChild size="sm" className="gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" /> Join on WhatsApp
        </a>
      </Button>
    </div>
  )
}
