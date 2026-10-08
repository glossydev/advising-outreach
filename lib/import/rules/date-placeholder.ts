import { readDate } from "../dates"
import type { Rule } from "../types"
import { activeRows, fieldsOfType, makeIssue, quote, valueOf } from "./helpers"

/** D5: placeholder text such as N/A in a date column. Optional dates can be cleared in one click. */
export const datePlaceholder: Rule = {
  name: "date_placeholder",
  decision: "D5",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const dateFields = fieldsOfType(ctx.kind, "date")
    return activeRows(rows).flatMap((row) =>
      dateFields.flatMap((f) => {
        const raw = valueOf(row, f.key)
        if (readDate(raw).kind !== "placeholder") return []
        return [
          makeIssue(
            "date_placeholder",
            "error",
            row,
            f.key,
            f.required
              ? `${quote(raw.trim())} is a placeholder, not a date. A date is required here.`
              : `${quote(raw.trim())} is a placeholder, not a date. Leaving it blank means no date on record.`,
            {
              value: raw,
              suggestions: f.required ? [] : [{ label: "Leave blank", set: { [f.key]: "" } }],
              bulk: !f.required,
            },
          ),
        ]
      }),
    )
  },
}
