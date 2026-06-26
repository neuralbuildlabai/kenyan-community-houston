type DashboardStatusBannerProps = {
  message: string
  variant?: 'warning' | 'info'
}

export function DashboardStatusBanner({ message, variant = 'warning' }: DashboardStatusBannerProps) {
  return (
    <div
      role="status"
      className={
        variant === 'warning'
          ? 'rounded-xl border border-amber-200/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-950'
          : 'rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-sm text-foreground'
      }
    >
      {message}
    </div>
  )
}
