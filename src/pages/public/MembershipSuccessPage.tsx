import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Button } from '@/components/ui/button'

export function MembershipSuccessPage() {
  return (
    <>
      <SEOHead title="Membership received" description="Thank you for registering with Kenyans in Greater Houston." />
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-6">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600" aria-hidden />
        <h1 className="text-2xl font-bold">Thank you for registering</h1>
        <p className="text-muted-foreground leading-relaxed">
          Thank you for registering with Kenyans in Greater Houston. Your membership registration has been received. A community representative may follow up regarding membership dues, events, and next steps.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild>
            <Link to="/support">Ways to Support KIGH</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
