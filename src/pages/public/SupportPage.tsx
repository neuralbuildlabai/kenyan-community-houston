import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { SEOHead } from '@/components/SEOHead'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const HANDLES = [
  { label: 'KIGH Cash App', handle: '$KighTreasurer', copy: '$KighTreasurer' },
  { label: 'Venmo', handle: '@KIGH_Treasurer', copy: '@KIGH_Treasurer' },
  { label: 'PayPal', handle: '@KighTreasurer', copy: '@KighTreasurer' },
] as const

function CopyRow({ label, handle, copy }: { label: string; handle: string; copy: string }) {
  const [done, setDone] = useState(false)
  async function copyText() {
    try {
      await navigator.clipboard.writeText(copy)
      setDone(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setDone(false), 2000)
    } catch {
      toast.error('Could not copy — select the handle manually')
    }
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{label}</CardTitle>
        <CardDescription className="text-base font-mono text-foreground">{handle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyText}>
          {done ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {done ? 'Copied' : 'Copy handle'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function SupportPage() {
  return (
    <>
      <SEOHead
        title="Ways to Support KIGH"
        description="Official ways to support Kenyans in Greater Houston programs through approved treasury handles."
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ways to Support KIGH</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Your support helps KIGH organize community events, youth programs, cultural activities, newcomer resources, and community support initiatives across Greater Houston.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          {HANDLES.map((h) => (
            <CopyRow key={h.label} {...h} />
          ))}
        </div>

        <Card className="bg-muted/40 border-dashed">
          <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              Please include your name and purpose in the payment note when possible, such as membership dues, event support, fundraiser, or general KIGH support.
            </p>
            <p>
              KIGH support options are provided for community contributions and membership-related payments. Please contact KIGH leadership or the Treasurer for questions about payments, receipts, or official financial records.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
