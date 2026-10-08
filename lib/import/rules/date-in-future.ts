import { formatLongDate, readDate } from "../dates"
import type { Rule } from "../types"
import { activeRows, fieldsOfType, makeIssue, valueOf } from "./helpers"

/** D8: a contact date after the reference "today". Checked once the date is in YYYY-MM-DD form. */
export const dateInFuture: Rule = {
  name: "date_in_future",
  decision: "D8",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const dateFields = fieldsOfType(ctx.kind, "date").filter((f) => !f.allowFuture)
    return activeRows(rows).flatMap((row) =>
      dateFields.flatMap((f) => {
        const raw = valueOf(row, f.key)
        const reading = readDate(raw)
        if (reading.kind !== "date" || !reading.isIso || reading.iso <= ctx.today) return []
        return [
          makeIssue(
            "date_in_future",
            "error",
            row,
            f.key,
            `${formatLongDate(reading.iso)} is after today (${formatLongDate(ctx.today)}). A contact can't have happened yet.`,
            { value: raw },
          ),
        ]
      }),
    )
  },
}
