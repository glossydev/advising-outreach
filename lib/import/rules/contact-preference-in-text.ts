import { readDate } from "../dates"
import { extractContactPreference } from "../text"
import type { Rule } from "../types"
import { activeRows, makeIssue, quote, valueOf } from "./helpers"

/** What's saved on the student when the D19 suggestion is accepted. */
export interface SavedContactPreference {
  channel: "Phone" | "Email" | "Text" | null
  text: string
  note_id: string
  noted_on: string | null
}

/**
 * D19: a contact preference stated only in note text ("by phone only", "best reached after 5 pm").
 * The suggestion saves it on the student's record, where it's shown on every visit.
 */
export const contactPreferenceInText: Rule = {
  name: "contact_preference_in_text",
  decision: "D19",
  kinds: ["notes"],
  check(rows) {
    return activeRows(rows).flatMap((row) => {
      if (valueOf(row, "contact_preference") !== "") return []
      const preference = extractContactPreference(valueOf(row, "note_text"))
      if (!preference) return []
      const date = readDate(valueOf(row, "contact_date"))
      const saved: SavedContactPreference = {
        ...preference,
        note_id: valueOf(row, "note_id").trim(),
        noted_on: date.kind === "date" ? date.iso : null,
      }
      const studentId = valueOf(row, "student_id").trim()
      return [
        makeIssue("contact_preference_in_text", "warning", row, "note_text", `States a contact preference: ${quote(preference.text)}`, {
          suggestions: [
            {
              label: `Save to ${studentId}'s record${preference.channel ? ` (${preference.channel} only)` : ""}`,
              set: { contact_preference: JSON.stringify(saved) },
            },
          ],
        }),
      ]
    })
  },
}
