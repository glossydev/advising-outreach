import { describe, expect, it } from "vitest"
import { WEIGHTS, compareOutreach, lastContactFor, scoreStudent, type ScoringNote, type ScoringStudent } from "@/lib/scoring"

const TODAY = "2026-10-05"

const student = (overrides: Partial<ScoringStudent> = {}): ScoringStudent => ({
  student_id: "S1",
  risk_flag: "Low",
  gpa: 3.5,
  class_year: "Junior",
  credits_earned: 70,
  source_last_contact_date: null,
  ...overrides,
})
const note = (
  contact_date: string,
  note_text = "Checked in.",
  follow_up_date: string | null = null,
  follow_up_done_by: string | null = null,
): ScoringNote => ({
  note_id: `N-${contact_date}`,
  contact_date,
  note_text,
  follow_up_date,
  follow_up_done_by,
})
const ranked = (...entries: [string, ScoringStudent, ScoringNote[]][]) =>
  entries
    .map(([sortName, s, notes]) => ({ sortName, outreach: scoreStudent(s, notes, TODAY) }))
    .sort(compareOutreach)
    .map((e) => e.sortName)
const followUpReason = (notes: ScoringNote[]) => scoreStudent(student(), notes, TODAY).reasons.find((r) => r.rule === "follow_up")

describe("ranking", () => {
  it("puts a student with no contact on record above everyone without a follow-up due (D24)", () => {
    const neverContacted = student({ risk_flag: "Low", gpa: 3.9 })
    const worstContacted = student({ risk_flag: "High", gpa: 1.5, source_last_contact_date: "2026-01-01" })
    const notes = [note("2026-01-01", "Left voicemail. No response.")]
    expect(scoreStudent(worstContacted, notes, TODAY).score).toBeGreaterThan(scoreStudent(neverContacted, [], TODAY).score)
    expect(ranked(["contacted", worstContacted, notes], ["never", neverContacted, []])).toEqual(["never", "contacted"])
  })

  it("ranks a high-risk student contacted recently below a low-risk student with no contact", () => {
    const recentHighRisk = student({ risk_flag: "High", gpa: 3.0 })
    expect(ranked(["recent-high", recentHighRisk, [note("2026-09-30")]], ["none-low", student(), []])).toEqual(["none-low", "recent-high"])
    expect(scoreStudent(recentHighRisk, [note("2026-09-30")], TODAY).score).toBeLessThan(scoreStudent(student(), [], TODAY).score)
  })

  it("puts a follow-up due today or overdue above everyone, the longest overdue first (P8)", () => {
    expect(
      ranked(
        ["never", student({ risk_flag: "High" }), []],
        ["due-today", student(), [note("2026-09-28", "Checked in.", "2026-10-05")]],
        ["overdue", student(), [note("2026-09-20", "Checked in.", "2026-10-01")]],
        ["tomorrow", student({ risk_flag: "High", gpa: 1.5 }), [note("2026-06-01", "Checked in.", "2026-10-06")]],
      ),
    ).toEqual(["overdue", "due-today", "never", "tomorrow"])
  })
})

describe("follow-ups (P8)", () => {
  it("starts adding points two days before, and the most on the day or after", () => {
    expect(followUpReason([note("2026-09-28", "x", "2026-10-08")])).toBeUndefined()
    expect(followUpReason([note("2026-09-28", "x", "2026-10-07")])).toMatchObject({ points: WEIGHTS.followUpInTwoDays, text: "Follow-up due Oct 7 (in 2 days)" })
    expect(followUpReason([note("2026-09-28", "x", "2026-10-06")])).toMatchObject({ points: WEIGHTS.followUpTomorrow, text: "Follow-up due tomorrow" })
    expect(followUpReason([note("2026-09-28", "x", "2026-10-05")])).toMatchObject({ points: WEIGHTS.followUpDue, text: "Follow-up due today" })
    expect(followUpReason([note("2026-09-28", "x", "2026-10-04")])).toMatchObject({ points: WEIGHTS.followUpDue, text: "Follow-up was due Oct 4 (1 day ago)" })
  })

  it("stays open when a later, unrelated contact is logged", () => {
    const notes = [note("2026-09-28", "Set a check-in.", "2026-10-05"), note("2026-10-02", "Sent campus map.")]
    const result = scoreStudent(student(), notes, TODAY)
    expect(result.followUpDue).toBe(true)
    expect(result.openFollowUps).toEqual([{ date: "2026-10-05", note_id: "N-2026-09-28" }])
  })

  it("closes once a contact is logged as completing it", () => {
    const result = scoreStudent(student(), [note("2026-09-28", "Set a check-in.", "2026-10-05", "N-2026-10-05")], TODAY)
    expect(result).toMatchObject({ followUpDue: false, openFollowUps: [] })
    expect(result.reasons.map((r) => r.rule)).not.toContain("follow_up")
  })

  it("lists every open follow-up, soonest first, whether or not it earns points yet", () => {
    const notes = [note("2026-09-11", "Follow up by Oct 15.", "2026-10-15"), note("2026-09-20", "Check in.", "2026-11-01")]
    const result = scoreStudent(student(), notes, TODAY)
    expect(result.openFollowUps.map((f) => f.date)).toEqual(["2026-10-15", "2026-11-01"])
    expect(result.reasons.map((r) => r.rule)).not.toContain("follow_up")
  })
})

describe("reasons", () => {
  it("lists every contributing factor with its points, and caps the score at 100", () => {
    const s = student({ risk_flag: "High", gpa: 1.98, class_year: "Senior", credits_earned: 85 })
    const result = scoreStudent(s, [note("2026-06-02", "Student to reply with availability. No reply yet.", "2026-07-01")], TODAY)
    expect(result.reasons.map((r) => [r.rule, r.points, r.text])).toEqual([
      ["days_since_contact", 35, "No contact in 125 days"],
      ["risk_flag", WEIGHTS.riskHigh, "High risk flag"],
      ["gpa", WEIGHTS.gpaBelow2, "GPA 1.98 (below 2.0)"],
      ["waiting_on_student", WEIGHTS.waitingOnStudent, "Waiting on a reply since Jun 2 (125 days)"],
      ["follow_up", WEIGHTS.followUpDue, "Follow-up was due Jul 1 (96 days ago)"],
      ["credits_behind", WEIGHTS.creditsBehind, "85 credits, below the usual 90+ for a Senior"],
    ])
    expect(result.score).toBe(100)
  })

  it("adds nothing for a student in good standing contacted last week", () => {
    expect(scoreStudent(student(), [note("2026-09-28")], TODAY)).toMatchObject({ score: 0, reasons: [], daysSinceContact: 7 })
  })

  it("doesn't count an office's pending decision as waiting on the student (D25)", () => {
    const result = scoreStudent(student(), [note("2026-09-01", "Financial aid appeal pending.")], TODAY)
    expect(result.reasons.map((r) => r.rule)).not.toContain("waiting_on_student")
  })
})

describe("last contact (D22)", () => {
  it("uses whichever of the newest note and the spreadsheet is later", () => {
    expect(lastContactFor(student({ source_last_contact_date: "2026-06-02" }), [note("2026-06-10")])).toEqual({ date: "2026-06-10", source: "note" })
    expect(lastContactFor(student({ source_last_contact_date: "2026-09-20" }), [note("2026-06-10")])).toEqual({ date: "2026-09-20", source: "spreadsheet" })
    expect(lastContactFor(student(), [])).toBeNull()
  })
})
