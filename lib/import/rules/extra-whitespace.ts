import type { Rule } from "../types"
import { activeRows, fieldsOfType, makeIssue, valueOf } from "./helpers"

/**
 * D14: leading, trailing or doubled spaces in a free-text field or ID. Dates, numbers and category
 * values aren't checked here: their own rules require an exact value and suggest the clean one.
 * Long note text is only checked at the ends; double spaces inside prose are harmless.
 */
export const extraWhitespace: Rule = {
  name: "extra_whitespace",
  decision: "D14",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const fields = fieldsOfType(ctx.kind, "id", "text", "email", "longtext")
    return activeRows(rows).flatMap((row) =>
      fields.flatMap((f) => {
        const raw = valueOf(row, f.key)
        const cleaned = f.type === "longtext" ? raw.trim() : raw.trim().replace(/\s+/g, " ")
        if (raw === cleaned) return []
        return [
          makeIssue("extra_whitespace", "warning", row, f.key, "Has extra spaces.", {
            value: raw,
            suggestions: [{ label: "Remove the extra spaces", set: { [f.key]: cleaned } }],
            bulk: true,
          }),
        ]
      }),
    )
  },
}
