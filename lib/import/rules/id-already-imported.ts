import { readDate, formatLongDate } from "../dates"
import { fieldLabel } from "../fields"
import { collapseSpaces, removeSsn } from "../text"
import type { ExistingNote, ExistingStudent, ImportRow, Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

const isoOrNull = (raw: string) => {
  const d = readDate(raw)
  return d.kind === "date" ? d.iso : null
}

/** The fields a students import would change on an existing record, as "label (old → new)". */
export function studentChanges(row: ImportRow, existing: ExistingStudent): string[] {
  const text = (key: keyof ExistingStudent & string) => {
    const now = valueOf(row, key).trim()
    const before = String(existing[key] ?? "")
    return now === before ? [] : [`${fieldLabel("students", key)} (${before || "blank"} → ${now || "blank"})`]
  }
  const changes = [
    ...(["first_name", "last_name", "email", "major", "class_year", "advisor", "risk_flag"] as const).flatMap(text),
  ]
  const credits = Number(valueOf(row, "credits_earned").trim())
  if (credits !== existing.credits_earned)
    changes.push(`Credits earned (${existing.credits_earned} → ${valueOf(row, "credits_earned").trim()})`)
  const gpaRaw = valueOf(row, "gpa").trim()
  const gpa = gpaRaw === "" ? null : Number(gpaRaw)
  if (gpa !== existing.gpa) changes.push(`GPA (${existing.gpa ?? "blank"} → ${gpaRaw || "blank"})`)
  const contact = isoOrNull(valueOf(row, "last_contact_date"))
  if (contact !== existing.source_last_contact_date)
    changes.push(`Last contact date (${existing.source_last_contact_date ?? "blank"} → ${contact ?? "blank"})`)
  return changes
}

/** Whether a notes-file row is the same note as the stored one. Stored text has SSNs removed (D17). */
export function sameNote(row: ImportRow, existing: ExistingNote): boolean {
  return (
    valueOf(row, "student_id").trim() === existing.student_id &&
    isoOrNull(valueOf(row, "contact_date")) === existing.contact_date &&
    valueOf(row, "contact_type").trim() === existing.contact_type &&
    valueOf(row, "advisor").trim() === existing.advisor &&
    collapseSpaces(removeSsn(valueOf(row, "note_text"))) === collapseSpaces(existing.note_text)
  )
}

/** D3: the ID is already in the database. Imports add and update, never delete (P1). */
export const idAlreadyImported: Rule = {
  name: "id_already_imported",
  decision: "D3",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    return activeRows(rows).flatMap((row) => {
      if (ctx.kind === "students") {
        const existing = ctx.existing.students.get(valueOf(row, "student_id").trim())
        if (!existing) return []
        const changes = studentChanges(row, existing)
        return [
          changes.length === 0
            ? makeIssue("id_already_imported", "info", row, "student_id", "Already in the database with the same details. Nothing will change.")
            : makeIssue(
                "id_already_imported",
                "warning",
                row,
                "student_id",
                `Already in the database. Importing will update: ${changes.join("; ")}.`,
              ),
        ]
      }
      const existing = ctx.existing.notes.get(valueOf(row, "note_id").trim())
      if (!existing) return []
      return [
        sameNote(row, existing)
          ? makeIssue("id_already_imported", "info", row, "note_id", "Already imported. This row will be skipped.")
          : makeIssue(
              "id_already_imported",
              "error",
              row,
              "note_id",
              `A different note with this ID is already in the database (${existing.student_id}, ${formatLongDate(existing.contact_date)}).`,
              { value: valueOf(row, "note_id"), suggestions: [{ label: "Exclude this row", exclude: true }] },
            ),
      ]
    })
  },
}
