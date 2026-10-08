import { readDate } from "../dates"
import type { Rule } from "../types"
import { activeRows, fieldsOfType, makeIssue, quote, valueOf } from "./helpers"

/** D6: not blank, not a placeholder, and not a recognizable or real calendar date. No guess is offered. */
export const dateUnreadable: Rule = {
  name: "date_unreadable",
  decision: "D6",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const dateFields = fieldsOfType(ctx.kind, "date")
    return activeRows(rows).flatMap((row) =>
      dateFields.flatMap((f) => {
        const raw = valueOf(row, f.key)
        if (readDate(raw).kind !== "unreadable") return []
        return [
          makeIssue("date_unreadable", "error", row, f.key, `${quote(raw.trim())} can't be read as a date. Type it as YYYY-MM-DD.`, {
            value: raw,
          }),
        ]
      }),
    )
  },
}
