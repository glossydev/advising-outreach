import type { ImportKind } from "./fields"
import { RULES } from "./rules"
import type { ImportRow, Issue, RuleContext } from "./types"

/** Runs every rule for this kind of import. Pure: the same rows and context always give the same issues. */
export function validateRows(kind: ImportKind, rows: readonly ImportRow[], ctx: Omit<RuleContext, "kind">): Issue[] {
  const context: RuleContext = { ...ctx, kind }
  return RULES.filter((rule) => rule.kinds.includes(kind)).flatMap((rule) => rule.check(rows, context))
}

/** An issue still needs attention unless its row is excluded, it's informational, or it's a warning kept as is. */
export function needsAttention(issue: Issue, rows: readonly ImportRow[]): boolean {
  const row = rows[issue.rowIndex]
  if (!row || row.excluded || issue.severity === "info") return false
  return !(issue.severity === "warning" && row.acknowledged.includes(issue.key))
}

/** Errors on rows that are still included. Commit is refused while any remain. */
export function blockingIssues(issues: readonly Issue[], rows: readonly ImportRow[]): Issue[] {
  return issues.filter((i) => i.severity === "error" && !rows[i.rowIndex]?.excluded)
}
