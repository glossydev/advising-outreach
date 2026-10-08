import type { ImportRow, Rule } from "../types"
import { activeRows, makeIssue, studentLabel, valueOf } from "./helpers"

const emailKey = (s: string) => s.trim().toLowerCase()

/** D13: another student, in the file or the database, has the same email. */
export const emailShared: Rule = {
  name: "email_shared",
  decision: "D13",
  kinds: ["students"],
  check(rows, ctx) {
    const inDatabase = new Map([...ctx.existing.students.values()].map((s) => [emailKey(s.email), s]))
    const inFile = new Map<string, ImportRow>()
    return activeRows(rows).flatMap((row) => {
      const email = emailKey(valueOf(row, "email"))
      const id = valueOf(row, "student_id").trim()
      if (!email) return []
      const stored = inDatabase.get(email)
      const earlier = inFile.get(email)
      if (!earlier) inFile.set(email, row)
      const other =
        stored && stored.student_id !== id
          ? studentLabel(stored)
          : earlier && valueOf(earlier, "student_id").trim() !== id
            ? `${valueOf(earlier, "student_id").trim()} ${valueOf(earlier, "first_name").trim()} ${valueOf(earlier, "last_name").trim()} (row ${earlier.index + 2})`
            : null
      if (!other) return []
      return [
        makeIssue("email_shared", "warning", row, "email", `Same email as ${other}.`, { value: valueOf(row, "email") }),
      ]
    })
  },
}
