import type { Rule } from "../types"
import { activeRows, findStudent, makeIssue, quote, studentLabel, valueOf } from "./helpers"

/**
 * D16: the note's student isn't in the database. If the ID only differs in case or spacing, the
 * stored ID is suggested; otherwise the person picks the right student or excludes the row.
 */
export const unknownStudent: Rule = {
  name: "unknown_student",
  decision: "D16",
  kinds: ["notes"],
  check(rows, ctx) {
    return activeRows(rows).flatMap((row) => {
      const raw = valueOf(row, "student_id")
      if (raw.trim() === "") return []
      const found = findStudent(ctx.existing, raw)
      if (found?.exact) return []
      if (found) {
        return [
          makeIssue("unknown_student", "error", row, "student_id", `No student ${quote(raw)}. Did you mean ${studentLabel(found.student)}?`, {
            value: raw,
            suggestions: [{ label: `Change to ${found.student.student_id}`, set: { student_id: found.student.student_id } }],
            bulk: true,
          }),
        ]
      }
      return [
        makeIssue(
          "unknown_student",
          "error",
          row,
          "student_id",
          `No student with ID ${quote(raw.trim())} in the database. Import that student first, pick the right student, or exclude this note.`,
          { value: raw },
        ),
      ]
    })
  },
}
