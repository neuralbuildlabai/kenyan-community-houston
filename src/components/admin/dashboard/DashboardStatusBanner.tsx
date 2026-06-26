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
          ? 'rounded-xl border border-amber-200/40 bg-amber-50/70 px-4 py-3 text-sm text-amber-950'
          : 'rounded-xl border border-kenyan-green-200/40 bg-kenyan-green-50/50 px-4 py-3 text-sm text-foreground'
      }
    >
      {message}
    </div>
  )
}
