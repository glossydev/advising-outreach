import { findSensitiveTerms } from "../text"
import type { Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

/**
 * D18: health, mental-health, privacy-request or government-ID terms in note text. Blocking until
 * someone decides: sensitive notes show collapsed until revealed and are left out of summaries.
 */
export const sensitiveContent: Rule = {
  name: "sensitive_content",
  decision: "D18",
  kinds: ["notes"],
  check(rows) {
    return activeRows(rows).flatMap((row) => {
      const decided = valueOf(row, "is_sensitive")
      if (decided === "yes" || decided === "no") return []
      const terms = findSensitiveTerms(valueOf(row, "note_text"))
      if (terms.length === 0) return []
      return [
        makeIssue(
          "sensitive_content",
          "error",
          row,
          "note_text",
          `Mentions ${terms.map((t) => `${t.label} ("${t.match}")`).join(", ")}. Decide whether this note is sensitive: sensitive notes stay collapsed until someone chooses to read them, and are left out of summaries.`,
          {
            suggestions: [
              { label: "Mark as sensitive", set: { is_sensitive: "yes" } },
              { label: "Not sensitive", set: { is_sensitive: "no" } },
            ],
          },
        ),
      ]
    })
  },
}
