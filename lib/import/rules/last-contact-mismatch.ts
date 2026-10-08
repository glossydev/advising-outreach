import { formatLongDate, readDate } from "../dates"
import type { ImportRow, Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

const isoOf = (raw: string) => {
  const d = readDate(raw)
  return d.kind === "date" ? d.iso : null
}

function message(studentId: string, spreadsheet: string, newestNote: string): string {
  const used = spreadsheet > newestNote ? spreadsheet : newestNote
  return `The spreadsheet says ${studentId} was last contacted ${formatLongDate(spreadsheet)}; the newest note is from ${formatLongDate(newestNote)}. The app uses the later date, ${formatLongDate(used)}.`
}

/**
 * D22: the spreadsheet's last_contact_date and the student's newest note disagree. Information only:
 * the app always uses the later of the two (lib/scoring.ts, lastContactFor).
 */
export const lastContactMismatch: Rule = {
  name: "last_contact_mismatch",
  decision: "D22",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    if (ctx.kind === "students") {
      return activeRows(rows).flatMap((row) => {
        const id = valueOf(row, "student_id").trim()
        const newest = ctx.existing.students.get(id)?.newest_note_date
        const spreadsheet = isoOf(valueOf(row, "last_contact_date"))
        if (!newest || !spreadsheet || newest === spreadsheet) return []
        return [makeIssue("last_contact_mismatch", "info", row, "last_contact_date", message(id, spreadsheet, newest))]
      })
    }

    // Notes: the newest note per student, counting both stored notes and this file.
    const newestRow = new Map<string, { row: ImportRow; date: string }>()
    for (const row of activeRows(rows)) {
      const id = valueOf(row, "student_id").trim()
      const date = isoOf(valueOf(row, "contact_date"))
      if (!date) continue
      const current = newestRow.get(id)
      if (!current || date > current.date) newestRow.set(id, { row, date })
    }
    return [...newestRow].flatMap(([id, { row, date }]) => {
      const student = ctx.existing.students.get(id)
      const spreadsheet = student?.source_last_contact_date
      if (!student || !spreadsheet) return []
      const stored = student.newest_note_date
      const newest = stored && stored > date ? stored : date
      if (newest === spreadsheet) return []
      return [makeIssue("last_contact_mismatch", "info", row, "contact_date", message(id, spreadsheet, newest))]
    })
  },
}
