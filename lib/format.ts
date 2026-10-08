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

export function addDays(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10)
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

export const METHOD_LABELS = {
  email: "Email",
  phone: "Phone",
  in_person: "In person",
  video: "Video",
  text: "Text",
  other: "Other",
} as const
