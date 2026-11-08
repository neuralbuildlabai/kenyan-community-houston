import { Header } from './Header'
import { RouteOutlet } from './RouteOutlet'
import { Footer } from './Footer'
import { StagingBanner } from '@/components/StagingBanner'
import { AnalyticsRouteListener } from '@/components/AnalyticsRouteListener'
import { PasswordExpiryBanner } from '@/components/PasswordExpiryBanner'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsRouteListener />
      <StagingBanner />
      <PasswordExpiryBanner />
      <Header />
      <main className="flex-1 min-w-0 bg-gradient-to-b from-background via-background to-secondary/20">
        <RouteOutlet />
      </main>
      <Footer />
    </div>
  )
}
