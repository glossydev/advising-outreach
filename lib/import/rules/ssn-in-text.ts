import { SSN_REPLACEMENT, containsSsn, maskSsn, removeSsn } from "../text"
import type { Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

/**
 * D17: an SSN-shaped number (###-##-####) in note text. Blocking: the number must not be stored.
 * The value shown is masked, and the suggestion replaces the number with "[SSN removed]".
 */
export const ssnInText: Rule = {
  name: "ssn_in_text",
  decision: "D17",
  kinds: ["notes"],
  check(rows) {
    return activeRows(rows).flatMap((row) => {
      const text = valueOf(row, "note_text")
      if (!containsSsn(text)) return []
      return [
        makeIssue(
          "ssn_in_text",
          "error",
          row,
          "note_text",
          "Contains what looks like a Social Security number. SSNs must not be stored in advising notes.",
          {
            value: maskSsn(text),
            suggestions: [{ label: `Replace the number with ${SSN_REPLACEMENT}`, set: { note_text: removeSsn(text) } }],
            bulk: true,
          },
        ),
      ]
    })
  },
}
