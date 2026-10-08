import type { ContactNote, Student, StudentRecord } from "../types"
import { daysSince, formatDate } from "../format"

/*
 * v0's original mock scoring, kept only so the mock data layer (lib/data.ts) runs until Phase 4.
 * Superseded by lib/scoring.ts.
 */

/**
 * Rule-based outreach score (0–100). Each rule adds points and a human-readable reason.
 * Keep this transparent: advisors see the reasons verbatim.
 */
export function deriveStudent(record: StudentRecord, notes: ContactNote[]): Student {
  const newestNote = notes.reduce<ContactNote | null>(
    (latest, n) => (!latest || n.contact_date > latest.contact_date ? n : latest),
    null,
  )
  const lastContact =
    newestNote && (!record.last_contact_date || newestNote.contact_date > record.last_contact_date)
      ? newestNote.contact_date
      : record.last_contact_date

  const days = lastContact ? daysSince(lastContact) : null
  const reasons: string[] = []
  let score = 0

  if (days === null) {
    score += 40
    reasons.push("Never contacted")
  } else if (days >= 90) {
    score += 35
    reasons.push(`No contact in ${days} days`)
  } else if (days >= 60) {
    score += 28
    reasons.push(`No contact in ${days} days`)
  } else if (days >= 30) {
    score += 18
    reasons.push(`No contact in ${days} days`)
  } else if (days >= 14) {
    score += 6
  }

  if (record.risk_flag === "high") {
    score += 30
    reasons.push("High risk flag")
  } else if (record.risk_flag === "medium") {
    score += 15
    reasons.push("Medium risk flag")
  } else if (record.risk_flag === "unknown") {
    score += 8
    reasons.push("Risk flag unknown")
  }

  if (record.gpa === null) {
    score += 5
    reasons.push("GPA missing")
  } else if (record.gpa < 2.0) {
    score += 20
    reasons.push("GPA below 2.0")
  } else if (record.gpa < 2.5) {
    score += 10
    reasons.push("GPA below 2.5")
  }

  const overdueFollowUp = newestNote?.follow_up_date && daysSince(newestNote.follow_up_date) > 0
  if (overdueFollowUp && newestNote?.follow_up_date) {
    score += 15
    reasons.push(`Follow-up overdue since ${formatDate(newestNote.follow_up_date)}`)
  }

  if (record.class_year === "Senior" && record.credits < 100) {
    score += 6
    reasons.push("Senior with under 100 credits")
  }

  const { import_issues, ...rest } = record
  return {
    ...rest,
    last_contact_date: lastContact,
    days_since_contact: days,
    outreach_score: Math.min(100, score),
    outreach_reasons: reasons,
    data_issues: import_issues,
  }
}
