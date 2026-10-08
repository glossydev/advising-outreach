import { OVERDUE_DAYS } from "@/lib/config"
import { NO_CONTACT_LABEL, formatDate, formatDaysAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

/** "12 days ago" in muted text; overdue counts and "No contact on record" render in Arizona Red. */
export function DaysSince({ days, className }: { days: number | null; className?: string }) {
  if (days === null) return <span className={cn("font-medium text-signal", className)}>{NO_CONTACT_LABEL}</span>
  return (
    <span
      className={cn(
        "tabular-nums",
        days >= OVERDUE_DAYS ? "font-medium text-signal" : "text-muted-foreground",
        className,
      )}
    >
      {formatDaysAgo(days)}
    </span>
  )
}

export function LastContact({ date, days }: { date: string | null; days: number | null }) {
  if (!date || days === null) return <DaysSince days={null} className="text-[13px]" />
  return (
    <span className="flex flex-col leading-tight">
      <span className="tabular-nums">{formatDate(date)}</span>
      <DaysSince days={days} className="text-[13px]" />
    </span>
  )
}
