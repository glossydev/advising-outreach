import type { ImportKind } from "./fields"
import type { ImportRow, Issue, RuleContext, Suggestion } from "./types"
import { needsAttention, validateRows } from "./validate"

/*
 * Applying a person's choices to rows. Every change is a new rows array (rows are never mutated),
 * so the browser can keep history and the server can compare before and after.
 */

export function applySuggestion(rows: readonly ImportRow[], issue: Issue, suggestion: Suggestion): ImportRow[] {
  return rows.map((row) => {
    if (row.index !== issue.rowIndex) return row
    if (suggestion.exclude) return { ...row, excluded: true }
    return { ...row, values: { ...row.values, ...suggestion.set } }
  })
}

/** "Apply to all like this": each issue of the same rule and field takes its own first suggestion. */
export function applyToAllLike(rows: readonly ImportRow[], issues: readonly Issue[], like: Issue): ImportRow[] {
  return issues
    .filter((i) => i.rule === like.rule && i.field === like.field && i.suggestions.length > 0 && needsAttention(i, rows))
    .reduce<ImportRow[]>((acc, i) => applySuggestion(acc, i, i.suggestions[0]), [...rows])
}

export function setValue(rows: readonly ImportRow[], rowIndex: number, field: string, value: string): ImportRow[] {
  return rows.map((row) => (row.index === rowIndex ? { ...row, values: { ...row.values, [field]: value } } : row))
}

export function setExcluded(rows: readonly ImportRow[], rowIndex: number, excluded: boolean): ImportRow[] {
  return rows.map((row) => (row.index === rowIndex ? { ...row, excluded } : row))
}

/** Keep a warning as it is. */
export function acknowledge(rows: readonly ImportRow[], issue: Issue): ImportRow[] {
  return rows.map((row) =>
    row.index === issue.rowIndex && !row.acknowledged.includes(issue.key)
      ? { ...row, acknowledged: [...row.acknowledged, issue.key] }
      : row,
  )
}

/**
 * What the seed script does on the person's behalf (DECISIONS T5): accept each issue's first
 * (recommended) suggestion; exclude rows with a blocking issue that has no suggestion; keep other
 * warnings as they are. Repeats until nothing changes, since one fix can reveal another.
 */
export function acceptAllSuggestions(
  kind: ImportKind,
  rows: readonly ImportRow[],
  ctx: Omit<RuleContext, "kind">,
  maxPasses = 6,
): ImportRow[] {
  let current = [...rows]
  for (let pass = 0; pass < maxPasses; pass++) {
    const pending = validateRows(kind, current, ctx).filter((i) => needsAttention(i, current))
    if (pending.length === 0) break
    for (const issue of pending) {
      if (current[issue.rowIndex].excluded) continue
      if (issue.suggestions.length > 0) current = applySuggestion(current, issue, issue.suggestions[0])
      else if (issue.severity === "error") current = setExcluded(current, issue.rowIndex, true)
      else current = acknowledge(current, issue)
    }
  }
  return current
}
