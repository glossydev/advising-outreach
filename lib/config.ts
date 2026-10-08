/** The brief: treat "today" as October 5, 2026. */
const DEFAULT_REFERENCE_DATE = "2026-10-05"

/**
 * Overridable with NEXT_PUBLIC_REFERENCE_DATE (YYYY-MM-DD). NEXT_PUBLIC_ so client components that
 * import this file see the same value as the server.
 */
function referenceDate(): string {
  const value = process.env.NEXT_PUBLIC_REFERENCE_DATE?.trim()
  if (!value) return DEFAULT_REFERENCE_DATE
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))) return value
  console.warn(`Ignoring NEXT_PUBLIC_REFERENCE_DATE="${value}" (expected YYYY-MM-DD); using ${DEFAULT_REFERENCE_DATE}.`)
  return DEFAULT_REFERENCE_DATE
}

/** Reference date for every "days since contact" calculation. Never use new Date() for this. */
export const TODAY = new Date(referenceDate())

export const TODAY_ISO = TODAY.toISOString().slice(0, 10)

/** "Overdue" on the queue's summary: no contact in this many days, or none on record. */
export const OVERDUE_DAYS = 30

export const PAGE_SIZE = 25

export const ADVISOR_COOKIE = "advisor"

export const ALL_ADVISORS = "all"
