import { readDate } from "../dates"
import { collapseSpaces } from "../text"
import type { ImportRow, Rule } from "../types"
import { activeRows, lineOf, makeIssue, valueOf } from "./helpers"

function contentKey(row: ImportRow): string {
  const date = readDate(valueOf(row, "contact_date"))
  return [
    valueOf(row, "student_id").trim().toUpperCase(),
    date.kind === "date" ? date.iso : valueOf(row, "contact_date").trim(),
    valueOf(row, "contact_type").trim().toLowerCase(),
    collapseSpaces(valueOf(row, "note_text")).toLowerCase(),
  ].join("\u0001")
}

/** D21: the same note (student, date, type and text) logged twice under different note IDs. */
export const duplicateNoteInFile: Rule = {
  name: "duplicate_note_in_file",
  decision: "D21",
  kinds: ["notes"],
  check(rows) {
    const first = new Map<string, ImportRow>()
    return activeRows(rows).flatMap((row) => {
      if (valueOf(row, "note_text").trim() === "") return []
      const key = contentKey(row)
      const earlier = first.get(key)
      if (!earlier) {
        first.set(key, row)
        return []
      }
      if (valueOf(earlier, "note_id").trim() === valueOf(row, "note_id").trim()) return [] // same ID: D2's job
      return [
        makeIssue("duplicate_note_in_file", "warning", row, undefined, `Same note as row ${lineOf(earlier)} (${valueOf(earlier, "note_id").trim()}), under a different ID.`, {
          suggestions: [{ label: "Exclude this copy", exclude: true }],
        }),
      ]
    })
  },
}
