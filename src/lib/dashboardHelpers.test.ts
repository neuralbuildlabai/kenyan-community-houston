import { describe, expect, it } from 'vitest'
import {
  aggregateEngagementTotals,
  analyticsDateRangeLabel,
  analyticsPeriodLabel,
  buildTrendPolyline,
  engagementToTrendPoints,
  formatAnalyticsPathLabel,
  formatSafeCtaHref,
  trendSeriesMax,
} from '@/lib/dashboardHelpers'

describe('formatAnalyticsPathLabel', () => {
  it('maps root path to Home', () => {
    expect(formatAnalyticsPathLabel('/')).toEqual({ label: 'Home', rawPath: '/' })
  })

  it('maps known paths', () => {
    expect(formatAnalyticsPathLabel('/events')).toEqual({ label: 'Events', rawPath: '/events' })
  })

  it('title-cases unknown segments', () => {
    expect(formatAnalyticsPathLabel('/community-groups')).toEqual({
      label: 'Community Groups',
      rawPath: '/community-groups',
    })
  })
})

describe('formatSafeCtaHref', () => {
  it('returns relative paths only', () => {
    expect(formatSafeCtaHref('/events')).toBe('/events')
    expect(formatSafeCtaHref('https://evil.example')).toBeNull()
    expect(formatSafeCtaHref('//evil.example')).toBeNull()
  })
})

describe('aggregateEngagementTotals', () => {
  it('sums daily rows for day-based periods', () => {
    const totals = aggregateEngagementTotals(
      [
        {
          bucket_date: '2026-06-01',
          page_views: 10,
          unique_sessions: 4,
          clicks: 2,
          cta_clicks: 1,
          form_submissions: 1,
          sign_ins: 3,
        },
        {
          bucket_date: '2026-06-02',
          page_views: 5,
          unique_sessions: 2,
          clicks: 1,
          cta_clicks: 0,
          form_submissions: 0,
          sign_ins: 1,
        },
      ],
      [],
      '7d'
    )
    expect(totals).toEqual({
      page_views: 15,
      unique_sessions: 6,
      clicks: 3,
      cta_clicks: 1,
      form_submissions: 1,
      sign_ins: 4,
    })
  })

  it('sums monthly rows for monthly period', () => {
    const totals = aggregateEngagementTotals(
      [],
      [
        {
          bucket_month: '2026-05-01',
          page_views: 100,
          unique_sessions: 20,
          clicks: 15,
          cta_clicks: 8,
          form_submissions: 2,
          sign_ins: 5,
        },
      ],
      'monthly'
    )
    expect(totals.page_views).toBe(100)
    expect(totals.sign_ins).toBe(5)
  })
})

describe('engagementToTrendPoints', () => {
  it('builds daily trend labels from bucket_date', () => {
    const points = engagementToTrendPoints(
      [
        {
          bucket_date: '2026-06-15',
          page_views: 3,
          unique_sessions: 2,
          clicks: 1,
          cta_clicks: 1,
          form_submissions: 0,
          sign_ins: 0,
        },
      ],
      [],
      '30d'
    )
    expect(points[0]?.label).toBe('06-15')
    expect(points[0]?.page_views).toBe(3)
  })
})

describe('analyticsPeriodLabel', () => {
  it('returns human labels', () => {
    expect(analyticsPeriodLabel('monthly')).toBe('Last 12 months')
    expect(analyticsPeriodLabel('7d')).toBe('Last 7 days')
  })
})

describe('analyticsDateRangeLabel', () => {
  it('formats fixed range for monthly mode', () => {
    const label = analyticsDateRangeLabel('monthly', new Date('2026-06-26'))
    expect(label).toContain('2026')
  })
})

describe('trend chart helpers', () => {
  it('computes max across series', () => {
    expect(trendSeriesMax([{ label: 'a', page_views: 5, unique_sessions: 10, clicks: 1, form_submissions: 0 }])).toBe(10)
  })

  it('builds polyline path', () => {
    const path = buildTrendPolyline([0, 10], 10, 100, 40)
    expect(path.startsWith('M')).toBe(true)
    expect(path).toContain('L')
  })
})
