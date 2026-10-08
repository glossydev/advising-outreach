import { formatLongDate, readDate } from "../dates"
import { findFollowUpDate } from "../text"
import type { Rule } from "../types"
import { activeRows, makeIssue, quote, valueOf } from "./helpers"

/**
 * D20: an explicit month-and-day in note text ("by Oct 15"). The suggestion sets it as the note's
 * follow-up date. Vague phrases ("mid-October", "this week") are not guessed at.
 */
export const followUpDateInText: Rule = {
  name: "follow_up_date_in_text",
  decision: "D20",
  kinds: ["notes"],
  check(rows, ctx) {
    return activeRows(rows).flatMap((row) => {
      if (valueOf(row, "follow_up_date") !== "") return []
      const contact = readDate(valueOf(row, "contact_date"))
      const found = findFollowUpDate(valueOf(row, "note_text"), contact.kind === "date" ? contact.iso : ctx.today)
      if (!found) return []
      return [
        makeIssue("follow_up_date_in_text", "warning", row, "note_text", `Mentions a date: ${quote(found.phrase)}.`, {
          suggestions: [{ label: `Set the follow-up date to ${formatLongDate(found.iso)}`, set: { follow_up_date: found.iso } }],
        }),
      ]
    })
  },
}
