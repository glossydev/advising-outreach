import { DATE_PLACEHOLDERS } from "../dates"
import type { Issue, Rule, Suggestion } from "../types"
import { activeRows, makeIssue, quote, valueOf } from "./helpers"

const DECIMAL = /^\d+(\.\d+)?$/
const WHOLE = /^\d+$/

/**
 * D10: GPA must be a number from 0.0 to 4.0 (blank is allowed and shows as "—"); credits earned
 * must be a whole number of 0 or more.
 */
export const numberInvalid: Rule = {
  name: "number_invalid",
  decision: "D10",
  kinds: ["students"],
  check(rows) {
    return activeRows(rows).flatMap((row) => {
      const issues: Issue[] = []

      const gpa = valueOf(row, "gpa")
      if (gpa.trim() !== "" && !(DECIMAL.test(gpa) && Number(gpa) <= 4)) {
        const trimmed = gpa.trim()
        const suggestions: Suggestion[] =
          DECIMAL.test(trimmed) && Number(trimmed) <= 4
            ? [{ label: `Change to ${trimmed}`, set: { gpa: trimmed } }]
            : DATE_PLACEHOLDERS.has(trimmed.toLowerCase())
              ? [{ label: "Leave blank (GPA not on record)", set: { gpa: "" } }]
              : []
        const message = DECIMAL.test(trimmed)
          ? `GPA ${trimmed} is outside 0.0–4.0.`
          : `${quote(trimmed)} isn't a GPA. Use a number from 0.0 to 4.0, or leave it blank.`
        issues.push(makeIssue("number_invalid", "error", row, "gpa", message, { value: gpa, suggestions }))
      }

      const credits = valueOf(row, "credits_earned")
      if (credits.trim() !== "" && !WHOLE.test(credits)) {
        const trimmed = credits.trim()
        const whole = /^(\d+)\.0+$/.exec(trimmed)?.[1] ?? (WHOLE.test(trimmed) ? trimmed : null)
        issues.push(
          makeIssue(
            "number_invalid",
            "error",
            row,
            "credits_earned",
            `${quote(trimmed)} isn't a whole number of credits.`,
            { value: credits, suggestions: whole ? [{ label: `Change to ${whole}`, set: { credits_earned: whole } }] : [] },
          ),
        )
      }
      return issues
    })
  },
}
