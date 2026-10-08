/** Reference date for every "days since contact" calculation. Never use new Date() for this. */
export const TODAY = new Date("2026-10-05")

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
