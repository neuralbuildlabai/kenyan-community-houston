import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { StagingBanner } from '@/components/StagingBanner'
import { AnalyticsRouteListener } from '@/components/AnalyticsRouteListener'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsRouteListener />
      <StagingBanner />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
