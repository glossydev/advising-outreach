import { preferenceHeading } from "../../contact-preference"
import { formatLongDate, readDate } from "../dates"
import { extractContactPreference, maskSsn } from "../text"
import type { ImportRow, Rule } from "../types"
import { activeRows, lineOf, makeIssue, quote, valueOf } from "./helpers"

/**
 * D19: a contact preference stated in a note ("by phone only", "prefers email", "best reached after
 * 5 pm"). The suggestion saves it as the student's contact preference (P9), which never touches the
 * note's contact type: that records how the contact happened.
 * - Only the newest statement per student can be saved; older ones in the file are noted.
 * - It never replaces a newer preference already on the student's record.
 * - Accepting sets a flag. What's saved is worked out again from the note's final text when the
 *   import is committed, so a later fix (such as removing an SSN) carries through.
 */
export const contactPreferenceInText: Rule = {
  name: "contact_preference_in_text",
  decision: "D19",
  kinds: ["notes"],
  check(rows, ctx) {
    const statements = activeRows(rows).flatMap((row) => {
      const stated = extractContactPreference(valueOf(row, "note_text"))
      if (!stated) return []
      const date = readDate(valueOf(row, "contact_date"))
      return [{ row, stated, date: date.kind === "date" ? date.iso : "", studentId: valueOf(row, "student_id").trim() }]
    })
    const newest = new Map<string, ImportRow>()
    const newestDate = new Map<string, string>()
    for (const s of statements) {
      if (!newest.has(s.studentId) || s.date >= newestDate.get(s.studentId)!) {
        newest.set(s.studentId, s.row)
        newestDate.set(s.studentId, s.date)
      }
    }

    return statements.flatMap(({ row, stated, date, studentId }) => {
      const words = quote(maskSsn(stated.text))
      const heading = preferenceHeading(stated)
      const latest = newest.get(studentId)!
      if (latest !== row) {
        return [
          makeIssue(
            "contact_preference_in_text",
            "info",
            row,
            "note_text",
            `States a contact preference: ${words}. Row ${lineOf(latest)} (${valueOf(latest, "note_id").trim()}) states a newer one for ${studentId}, so only that one can be saved.`,
          ),
        ]
      }
      const onFile = ctx.existing.students.get(studentId)?.preference
      if (onFile && date && onFile.stated_on > date) {
        return [
          makeIssue(
            "contact_preference_in_text",
            "info",
            row,
            "note_text",
            `States a contact preference: ${words}. ${studentId}'s record already has a newer one (${onFile.heading}, from ${formatLongDate(onFile.stated_on)}), which is kept.`,
          ),
        ]
      }
      if (valueOf(row, "contact_preference") !== "") return []
      // Already saved from this statement (the same file imported again): nothing to decide.
      if (onFile && onFile.stated_on === date && onFile.heading === heading) return []
      const replaces = onFile ? ` Saving it replaces the one on file (${onFile.heading}, from ${formatLongDate(onFile.stated_on)}).` : ""
      return [
        makeIssue("contact_preference_in_text", "warning", row, "note_text", `States a contact preference: ${words}.${replaces}`, {
          suggestions: [{ label: `Save as ${studentId}'s contact preference (${heading})`, set: { contact_preference: "yes" } }],
        }),
      ]
    })
  },
}
