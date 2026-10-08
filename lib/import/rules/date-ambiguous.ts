import { formatLongDate, readDate } from "../dates"
import type { Rule } from "../types"
import { activeRows, fieldsOfType, makeIssue, quote, valueOf } from "./helpers"

/** D7: a slash date that could be month-first or day-first. Both readings are offered; nothing is assumed. */
export const dateAmbiguous: Rule = {
  name: "date_ambiguous",
  decision: "D7",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const dateFields = fieldsOfType(ctx.kind, "date")
    return activeRows(rows).flatMap((row) =>
      dateFields.flatMap((f) => {
        const raw = valueOf(row, f.key)
        const reading = readDate(raw)
        if (reading.kind !== "ambiguous") return []
        return [
          makeIssue(
            "date_ambiguous",
            "error",
            row,
            f.key,
            `${quote(raw.trim())} could be ${formatLongDate(reading.monthFirst)} or ${formatLongDate(reading.dayFirst)}.`,
            {
              value: raw,
              suggestions: [
                { label: `${formatLongDate(reading.monthFirst)} (month first)`, set: { [f.key]: reading.monthFirst } },
                { label: `${formatLongDate(reading.dayFirst)} (day first)`, set: { [f.key]: reading.dayFirst } },
              ],
            },
          ),
        ]
      }),
    )
  },
}
