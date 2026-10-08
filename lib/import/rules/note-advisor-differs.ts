import type { Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

/** D23: the note's author isn't the student's assigned advisor. Information only; nothing is reassigned. */
export const noteAdvisorDiffers: Rule = {
  name: "note_advisor_differs",
  decision: "D23",
  kinds: ["notes"],
  check(rows, ctx) {
    return activeRows(rows).flatMap((row) => {
      const student = ctx.existing.students.get(valueOf(row, "student_id").trim())
      const author = valueOf(row, "advisor").trim()
      if (!student || !author || author.toLowerCase() === student.advisor.trim().toLowerCase()) return []
      return [
        makeIssue(
          "note_advisor_differs",
          "info",
          row,
          "advisor",
          `Written by ${author}; ${student.student_id}'s assigned advisor is ${student.advisor}. The note keeps its author and the assignment doesn't change.`,
        ),
      ]
    })
  },
}
