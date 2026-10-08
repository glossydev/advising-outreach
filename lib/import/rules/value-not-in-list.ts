import { normalizeKey } from "../text"
import type { Rule } from "../types"
import { activeRows, fieldsOfType, makeIssue, quote, valueOf } from "./helpers"

/**
 * D9: a category value that isn't one of the allowed values. When it differs only in case, spacing
 * or punctuation ("low", "In-person"), the matching value is suggested; otherwise the person picks.
 */
export const valueNotInList: Rule = {
  name: "value_not_in_list",
  decision: "D9",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const choiceFields = fieldsOfType(ctx.kind, "choice")
    return activeRows(rows).flatMap((row) =>
      choiceFields.flatMap((f) => {
        const raw = valueOf(row, f.key)
        const choices = f.choices ?? []
        if (raw.trim() === "" || choices.includes(raw)) return []
        const close = choices.find((c) => normalizeKey(c) === normalizeKey(raw))
        return [
          makeIssue(
            "value_not_in_list",
            "error",
            row,
            f.key,
            close
              ? `${quote(raw)} should be written ${quote(close)}.`
              : `${quote(raw.trim())} isn't one of the allowed values: ${choices.join(", ")}.`,
            {
              value: raw,
              suggestions: close ? [{ label: `Change to ${close}`, set: { [f.key]: close } }] : [],
              bulk: Boolean(close),
            },
          ),
        ]
      }),
    )
  },
}
