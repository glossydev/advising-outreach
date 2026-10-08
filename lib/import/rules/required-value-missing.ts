import { FIELDS } from "../fields"
import type { Rule } from "../types"
import { activeRows, makeIssue, valueOf } from "./helpers"

/** D1: a required column is blank. No suggestion: type a value or exclude the row. */
export const requiredValueMissing: Rule = {
  name: "required_value_missing",
  decision: "D1",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const required = FIELDS[ctx.kind].filter((f) => f.required)
    return activeRows(rows).flatMap((row) =>
      required
        .filter((f) => valueOf(row, f.key).trim() === "")
        .map((f) => makeIssue("required_value_missing", "error", row, f.key, `${f.label} is required.`)),
    )
  },
}
