import { daysBetween, formatShortDate } from "@/lib/import/dates"
import { classStandingRange } from "@/lib/import/fields"
import { WAITING_ON_STUDENT } from "@/lib/import/text"

/*
 * The outreach score: who an advisor should contact next, and why. Every point comes with a
 * reason in plain words, and advisors see the reasons verbatim, so the ranking can be checked by
 * hand. Weights are in one table so they can be tuned with the advisors.
 */

export interface ScoringStudent {
  student_id: string
  risk_flag: string
  gpa: number | null
  class_year: string
  credits_earned: number
  /** The spreadsheet's last_contact_date, as imported. */
  source_last_contact_date: string | null
}

export interface ScoringNote {
  note_id: string
  contact_date: string
  note_text: string
  follow_up_date: string | null
  /** The note that completed this note's follow-up (P8); null or absent while it's open. */
  follow_up_done_by?: string | null
}

export interface OpenFollowUp {
  date: string
  note_id: string
}

export interface Reason {
  /** The scoring rule, e.g. "no_contact_on_record" (D24) or "waiting_on_student" (D25). */
  rule: string
  points: number
  text: string
}

export interface OutreachScore {
  /** 0–100. */
  score: number
  reasons: Reason[]
  lastContact: { date: string; source: "note" | "spreadsheet" } | null
  daysSinceContact: number | null
  /** No notes and no spreadsheet date: listed first in the queue regardless of score (D24). */
  noContactOnRecord: boolean
  /** Follow-ups not yet completed, soonest first (P8). */
  openFollowUps: OpenFollowUp[]
  /** The soonest open follow-up is due today or overdue: listed above everyone else (P8). */
  followUpDue: boolean
}

export const WEIGHTS = {
  noContactOnRecord: 40,
  daysSinceContact: [
    { minDays: 90, points: 35 },
    { minDays: 60, points: 28 },
    { minDays: 30, points: 18 },
    { minDays: 14, points: 6 },
  ],
  riskHigh: 30,
  riskMedium: 15,
  gpaBelow2: 20,
  gpaBelow2_5: 10,
  waitingOnStudent: 15,
  /**
   * Follow-ups (P8): a short ramp. Nothing until two days before; due today or overdue also lists
   * the student at the very top of the queue, whatever the score.
   */
  followUpInTwoDays: 10,
  followUpTomorrow: 20,
  followUpDue: 30,
  creditsBehind: 6,
} as const

const newestFirst = (notes: readonly ScoringNote[]) =>
  [...notes].sort((a, b) => b.contact_date.localeCompare(a.contact_date) || b.note_id.localeCompare(a.note_id))

/**
 * D22: last contact is the later of the newest note and the spreadsheet's date. A newer spreadsheet
 * date means a contact nobody wrote up; a newer note means the spreadsheet is stale.
 */
export function lastContactFor(student: ScoringStudent, notes: readonly ScoringNote[]): OutreachScore["lastContact"] {
  const newestNote = newestFirst(notes)[0]?.contact_date ?? null
  const sheet = student.source_last_contact_date
  if (!newestNote && !sheet) return null
  if (newestNote && (!sheet || newestNote >= sheet)) return { date: newestNote, source: "note" }
  return { date: sheet!, source: "spreadsheet" }
}

export function scoreStudent(student: ScoringStudent, notes: readonly ScoringNote[], today: string): OutreachScore {
  const reasons: Reason[] = []
  const add = (rule: string, points: number, text: string) => reasons.push({ rule, points, text })

  const lastContact = lastContactFor(student, notes)
  const days = lastContact ? daysBetween(lastContact.date, today) : null

  if (!lastContact) add("no_contact_on_record", WEIGHTS.noContactOnRecord, "Never contacted")
  else if (days !== null) {
    const band = WEIGHTS.daysSinceContact.find((b) => days >= b.minDays)
    if (band) add("days_since_contact", band.points, `No contact in ${days} days`)
  }

  if (student.risk_flag === "High") add("risk_flag", WEIGHTS.riskHigh, "High risk flag")
  else if (student.risk_flag === "Medium") add("risk_flag", WEIGHTS.riskMedium, "Medium risk flag")

  if (student.gpa !== null) {
    if (student.gpa < 2.0) add("gpa", WEIGHTS.gpaBelow2, `GPA ${student.gpa.toFixed(2)} (below 2.0)`)
    else if (student.gpa < 2.5) add("gpa", WEIGHTS.gpaBelow2_5, `GPA ${student.gpa.toFixed(2)} (below 2.5)`)
  }

  const newest = newestFirst(notes)[0]
  if (newest && WAITING_ON_STUDENT.test(newest.note_text)) {
    const waited = daysBetween(newest.contact_date, today)
    add("waiting_on_student", WEIGHTS.waitingOnStudent, `Waiting on a reply since ${formatShortDate(newest.contact_date, today)} (${waited} days)`)
  }

  // Every open follow-up counts, not just the newest note's: an unrelated contact doesn't close one (P8).
  const openFollowUps = notes
    .filter((n) => n.follow_up_date && !n.follow_up_done_by)
    .map((n) => ({ date: n.follow_up_date!, note_id: n.note_id }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.note_id.localeCompare(b.note_id))
  const next = openFollowUps[0]
  const until = next ? daysBetween(today, next.date) : null
  if (next && until !== null) {
    const due = formatShortDate(next.date, today)
    if (until < 0) add("follow_up", WEIGHTS.followUpDue, `Follow-up was due ${due} (${-until} ${-until === 1 ? "day" : "days"} ago)`)
    else if (until === 0) add("follow_up", WEIGHTS.followUpDue, "Follow-up due today")
    else if (until === 1) add("follow_up", WEIGHTS.followUpTomorrow, "Follow-up due tomorrow")
    else if (until === 2) add("follow_up", WEIGHTS.followUpInTwoDays, `Follow-up due ${due} (in 2 days)`)
  }

  const range = classStandingRange(student.class_year)
  if (range && student.credits_earned < range[0]) {
    add("credits_behind", WEIGHTS.creditsBehind, `${student.credits_earned} credits, below the usual ${range[0]}+ for a ${student.class_year}`)
  }

  return {
    score: Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0)),
    reasons,
    lastContact,
    daysSinceContact: days,
    noContactOnRecord: lastContact === null,
    openFollowUps,
    followUpDue: until !== null && until <= 0,
  }
}

type RankedEntry = { outreach: Pick<OutreachScore, "score" | "noContactOnRecord" | "followUpDue" | "openFollowUps">; sortName: string }

/**
 * Queue order:
 * 1. a follow-up due today or overdue, the longest overdue first (P8);
 * 2. never contacted (D24);
 * 3. highest score, then name.
 */
export function compareOutreach(a: RankedEntry, b: RankedEntry): number {
  const bothDue = a.outreach.followUpDue && b.outreach.followUpDue
  return (
    Number(b.outreach.followUpDue) - Number(a.outreach.followUpDue) ||
    (bothDue ? a.outreach.openFollowUps[0].date.localeCompare(b.outreach.openFollowUps[0].date) : 0) ||
    Number(b.outreach.noContactOnRecord) - Number(a.outreach.noContactOnRecord) ||
    b.outreach.score - a.outreach.score ||
    a.sortName.localeCompare(b.sortName)
  )
}
