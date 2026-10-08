import { formatLongDate, readDate } from "../dates"
import type { Rule } from "../types"
import { activeRows, fieldsOfType, makeIssue, quote, valueOf } from "./helpers"

/** D4: a recognized date that isn't written YYYY-MM-DD. One click converts it; "apply to all" is offered. */
export const dateNotIso: Rule = {
  name: "date_not_iso",
  decision: "D4",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const dateFields = fieldsOfType(ctx.kind, "date")
    return activeRows(rows).flatMap((row) =>
      dateFields.flatMap((f) => {
        const raw = valueOf(row, f.key)
        const reading = readDate(raw)
        if (reading.kind !== "date" || reading.isIso) return []
        return [
          makeIssue(
            "date_not_iso",
            "error",
            row,
            f.key,
            `${quote(raw)} isn't in the standard YYYY-MM-DD format. It reads as ${formatLongDate(reading.iso)}.`,
            { value: raw, suggestions: [{ label: `Change to ${reading.iso}`, set: { [f.key]: reading.iso } }], bulk: true },
          ),
        ]
      }),
    )
  },
}
