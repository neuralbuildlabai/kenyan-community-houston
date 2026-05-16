import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarGridDay } from '@/lib/calendarMonth'
import type { ResolvedCalendarHoliday } from '@/data/calendarHolidays'
import { buildDateAriaLabel } from '@/lib/calendarMonth'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

type MonthCalendarGridProps = {
  year: number
  month: number
  days: CalendarGridDay[]
  eventCountByDate: Map<string, number>
  holidays: ResolvedCalendarHoliday[]
  selectedDateKey: string | null
  onSelectDate: (dateKey: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToday: () => void
}

export function MonthCalendarGrid({
  year,
  month,
  days,
  eventCountByDate,
  holidays,
  selectedDateKey,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToday,
}: MonthCalendarGridProps) {
  const monthLabel = format(new Date(year, month, 1), 'MMMM yyyy')
  const holidaysByDate = new Map<string, ResolvedCalendarHoliday[]>()
  for (const h of holidays) {
    const list = holidaysByDate.get(h.dateKey) ?? []
    list.push(h)
    holidaysByDate.set(h.dateKey, list)
  }

  return (
    <section
      data-testid="calendar-month-grid"
      aria-label="Community calendar month view"
      className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-kenyan-gold-50/40 via-card to-kenyan-green-50/30 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onPrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2
          data-testid="calendar-month-label"
          className="text-base sm:text-lg font-semibold text-foreground tracking-tight"
        >
          {monthLabel}
        </h2>
        <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={onGoToday}>
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/20">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="py-2 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border/40 p-px" role="grid">
        {days.map((day) => {
          const dayHolidays = holidaysByDate.get(day.dateKey) ?? []
          const eventCount = eventCountByDate.get(day.dateKey) ?? 0
          const hasEvents = eventCount > 0
          const hasHoliday = dayHolidays.length > 0
          const isSelected = selectedDateKey === day.dateKey
          const holidayNames = dayHolidays.map((h) => h.name)
          const ariaLabel = buildDateAriaLabel(day.date, eventCount, holidayNames)

          return (
            <button
              key={day.dateKey}
              type="button"
              role="gridcell"
              data-date={day.dateKey}
              data-testid={`calendar-day-${day.dateKey}`}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              onClick={() => onSelectDate(day.dateKey)}
              className={cn(
                'relative flex min-h-[2.75rem] sm:min-h-[3.25rem] flex-col items-center justify-start gap-0.5 bg-card p-1 sm:p-1.5 text-center transition-colors',
                'hover:bg-kenyan-green-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset',
                !day.isCurrentMonth && 'bg-muted/10 text-muted-foreground/70',
                day.isToday && !isSelected && 'ring-2 ring-inset ring-kenyan-green-600/70',
                isSelected && 'bg-kenyan-green-800 text-white hover:bg-kenyan-green-800',
                isSelected && day.isToday && 'ring-2 ring-kenyan-gold-400 ring-offset-1 ring-offset-card'
              )}
            >
              <span
                className={cn(
                  'text-xs sm:text-sm font-semibold tabular-nums leading-none',
                  isSelected ? 'text-white' : 'text-foreground',
                  !day.isCurrentMonth && !isSelected && 'text-muted-foreground'
                )}
              >
                {day.date.getDate()}
              </span>
              <span className="flex min-h-[0.5rem] items-center justify-center gap-0.5">
                {hasEvents ? (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isSelected ? 'bg-kenyan-gold-400' : 'bg-kenyan-green-600'
                    )}
                    aria-hidden
                  />
                ) : null}
                {hasHoliday ? (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isSelected ? 'bg-kenyan-gold-200' : 'bg-kenyan-gold-500'
                    )}
                    aria-hidden
                  />
                ) : null}
              </span>
              <span className="hidden sm:block w-full truncate px-0.5 text-[9px] leading-tight">
                {!isSelected && hasHoliday ? (
                  <span className="text-kenyan-gold-700">{dayHolidays[0]?.name}</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-kenyan-green-600" aria-hidden /> Event day
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-kenyan-gold-500" aria-hidden /> Holiday
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm ring-2 ring-inset ring-kenyan-green-600/70" aria-hidden /> Today
        </span>
      </div>
    </section>
  )
}
