import { readDate } from "./dates"
import type { ImportKind } from "./fields"
import { sameNote, studentChanges } from "./rules/id-already-imported"
import type { SavedContactPreference } from "./rules/contact-preference-in-text"
import type { ImportRow, Issue, RuleContext } from "./types"
import { blockingIssues } from "./validate"

/*
 * Turns reviewed rows into the writes a commit will make. Pure. Values are stored exactly as the
 * person left them; the only conversions are text to number and blank to "no value".
 */

export interface StudentWrite {
  student_id: string
  first_name: string
  last_name: string
  email: string
  major: string
  class_year: string
  credits_earned: number
  gpa: number | null
  advisor: string
  risk_flag: string
  source_last_contact_date: string | null
  possible_duplicate_of: string | null
}

export interface NoteWrite {
  note_id: string
  student_id: string
  contact_date: string
  contact_type: string
  advisor: string
  note_text: string
  follow_up_date: string | null
  is_sensitive: boolean
}

export interface CommitPlan {
  kind: ImportKind
  /** Errors still on included rows. A plan with any of these must not be committed. */
  blocking: Issue[]
  studentInserts: StudentWrite[]
  studentUpdates: { write: StudentWrite; changes: string[] }[]
  noteInserts: NoteWrite[]
  /** Students already up to date, or notes already imported. */
  unchanged: string[]
  /** Contact preferences to save on students (D19), latest note wins. */
  preferences: { student_id: string; preference: SavedContactPreference }[]
  excludedRows: number[]
}

const isoOrNull = (raw: string) => {
  const d = readDate(raw)
  return d.kind === "date" ? d.iso : null
}

export function toStudentWrite(row: ImportRow): StudentWrite {
  const v = row.values
  return {
    student_id: v.student_id,
    first_name: v.first_name,
    last_name: v.last_name,
    email: v.email,
    major: v.major,
    class_year: v.class_year,
    credits_earned: Number(v.credits_earned),
    gpa: (v.gpa ?? "").trim() === "" ? null : Number(v.gpa),
    advisor: v.advisor,
    risk_flag: v.risk_flag,
    source_last_contact_date: isoOrNull(v.last_contact_date ?? ""),
    possible_duplicate_of: v.possible_duplicate_of || null,
  }
}

export function toNoteWrite(row: ImportRow): NoteWrite {
  const v = row.values
  return {
    note_id: v.note_id,
    student_id: v.student_id,
    contact_date: isoOrNull(v.contact_date) ?? v.contact_date,
    contact_type: v.contact_type,
    advisor: v.advisor,
    note_text: v.note_text,
    follow_up_date: isoOrNull(v.follow_up_date ?? ""),
    is_sensitive: v.is_sensitive === "yes",
  }
}

export function buildCommitPlan(
  kind: ImportKind,
  rows: readonly ImportRow[],
  issues: readonly Issue[],
  ctx: Omit<RuleContext, "kind">,
): CommitPlan {
  const plan: CommitPlan = {
    kind,
    blocking: blockingIssues(issues, rows),
    studentInserts: [],
    studentUpdates: [],
    noteInserts: [],
    unchanged: [],
    preferences: [],
    excludedRows: rows.filter((r) => r.excluded).map((r) => r.index),
  }

  const latestPreference = new Map<string, SavedContactPreference>()
  for (const row of rows) {
    if (row.excluded) continue
    if (kind === "students") {
      const write = toStudentWrite(row)
      const existing = ctx.existing.students.get(write.student_id)
      if (!existing) plan.studentInserts.push(write)
      else {
        const changes = studentChanges(row, existing)
        if (changes.length === 0 && !write.possible_duplicate_of) plan.unchanged.push(write.student_id)
        else plan.studentUpdates.push({ write, changes })
      }
      continue
    }

    const write = toNoteWrite(row)
    const existing = ctx.existing.notes.get(write.note_id)
    if (existing && sameNote(row, existing)) plan.unchanged.push(write.note_id)
    else if (!existing) plan.noteInserts.push(write)
    if (row.values.contact_preference) {
      const preference = JSON.parse(row.values.contact_preference) as SavedContactPreference
      const current = latestPreference.get(write.student_id)
      if (!current || (preference.noted_on ?? "") >= (current.noted_on ?? "")) latestPreference.set(write.student_id, preference)
    }
  }
  plan.preferences = [...latestPreference].map(([student_id, preference]) => ({ student_id, preference }))
  return plan
}
