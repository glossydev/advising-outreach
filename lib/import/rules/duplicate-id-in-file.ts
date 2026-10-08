import { FIELDS, ID_FIELD, fieldLabel } from "../fields"
import type { ImportRow, Rule } from "../types"
import { activeRows, lineOf, makeIssue, valueOf } from "./helpers"

/** D2: the same ID on more than one row. The later row is flagged; the suggestion excludes it. */
export const duplicateIdInFile: Rule = {
  name: "duplicate_id_in_file",
  decision: "D2",
  kinds: ["students", "notes"],
  check(rows, ctx) {
    const idField = ID_FIELD[ctx.kind]
    const first = new Map<string, ImportRow>()
    return activeRows(rows).flatMap((row) => {
      const id = valueOf(row, idField).trim().toUpperCase()
      if (!id) return []
      const earlier = first.get(id)
      if (!earlier) {
        first.set(id, row)
        return []
      }
      const identical = FIELDS[ctx.kind].every((f) => valueOf(row, f.key).trim() === valueOf(earlier, f.key).trim())
      return [
        makeIssue(
          "duplicate_id_in_file",
          "error",
          row,
          idField,
          identical
            ? `Exact copy of row ${lineOf(earlier)}.`
            : `Same ${fieldLabel(ctx.kind, idField)} as row ${lineOf(earlier)}, with different details. Keep one of the two.`,
          {
            value: valueOf(row, idField),
            suggestions: [{ label: identical ? "Exclude this copy" : "Exclude this row", exclude: true }],
          },
        ),
      ]
    })
  },
}
