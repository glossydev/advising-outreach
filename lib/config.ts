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

export const OVERDUE_DAYS = 30

export const PAGE_SIZE = 25

export const SUMMARY_MAX_LENGTH = 120

export const ADVISOR_COOKIE = "advisor"

export const ALL_ADVISORS = "all"

/**
 * The prototype renders mock summaries so both card states can be reviewed.
 * When wiring a real model, set MOCK_AI_SUMMARIES to false so the flag follows the env var.
 */
export const MOCK_AI_SUMMARIES = true

export const AI_SUMMARIES_CONFIGURED = MOCK_AI_SUMMARIES || Boolean(process.env.ANTHROPIC_API_KEY)
