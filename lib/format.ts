import { TODAY } from "./config"

const DAY_MS = 86_400_000

function toUtcMidnight(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function daysSince(iso: string, reference: Date = TODAY): number {
  return Math.round((toUtcMidnight(reference) - toUtcMidnight(new Date(iso))) / DAY_MS)
}

export function isBeforeToday(iso: string) {
  return daysSince(iso) > 0
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

export function formatDate(iso: string | null) {
  if (!iso) return "—"
  return dateFormatter.format(new Date(iso))
}

export function formatDaysAgo(days: number) {
  if (days <= 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

export function fullName(s: { first_name: string; last_name: string }) {
  return `${s.first_name} ${s.last_name}`
}

/** Shown wherever a student has no notes and no spreadsheet date (D24). The README defines blank as never contacted. */
export const NO_CONTACT_LABEL = "Never contacted"
