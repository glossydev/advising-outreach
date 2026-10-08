import { ID_FIELD, type ImportKind } from "./fields"
import { maskSsn } from "./text"
import type { ImportRow, Issue, RuleName, Severity } from "./types"

/*
 * The fix history of an import: for every value a rule flagged, what it was, what it became and
 * who decided. Worked out on the server by comparing the file as uploaded with the rows as
 * committed, so it doesn't depend on the browser's account of what happened.
 */

export type Resolution = "accepted_suggestion" | "edited" | "excluded_row" | "kept_as_is" | "info"

export interface FixRecord {
  rule: RuleName | "manual_edit" | "excluded_by_person"
  severity: Severity
  rowIndex: number
  recordId: string | null
  field: string | null
  message: string
  originalValue: string | null
  finalValue: string | null
  resolution: Resolution
}

/** Nothing about an import is ever stored with an SSN-shaped number in it (D17). */
const safe = (value: string | null | undefined) => (value === null || value === undefined ? null : maskSsn(value))

/**
 * The fields an issue's resolution shows up in: what its suggestions would set (is_sensitive for
 * D18, follow_up_date for D20), or the flagged field itself when it has none to set.
 */
function targetFields(issue: Issue): string[] {
  const fromSuggestions = [...new Set(issue.suggestions.flatMap((s) => Object.keys(s.set ?? {})))]
  if (fromSuggestions.length > 0) return fromSuggestions
  return issue.field ? [issue.field] : []
}

export function buildFixHistory(
  kind: ImportKind,
  originalRows: readonly ImportRow[],
  originalIssues: readonly Issue[],
  finalRows: readonly ImportRow[],
  finalIssues: readonly Issue[],
): FixRecord[] {
  const idField = ID_FIELD[kind]
  const records: FixRecord[] = []
  const covered = new Set<string>()

  for (const issue of originalIssues) {
    const before = originalRows[issue.rowIndex]
    const after = finalRows[issue.rowIndex]
    if (!before || !after) continue
    const fields = targetFields(issue)
    for (const f of issue.field ? [...fields, issue.field] : fields) covered.add(`${issue.rowIndex}:${f}`)
    const changed = fields.filter((f) => (before.values[f] ?? "") !== (after.values[f] ?? ""))
    const shown = changed[0] ?? issue.field ?? null
    const accepted = issue.suggestions.some(
      (s) => s.set && Object.entries(s.set).every(([f, v]) => (after.values[f] ?? "") === v),
    )

    const resolution: Resolution = after.excluded
      ? "excluded_row"
      : issue.severity === "info"
        ? "info"
        : changed.length === 0
          ? "kept_as_is"
          : accepted
            ? "accepted_suggestion"
            : "edited"

    records.push({
      rule: issue.rule,
      severity: issue.severity,
      rowIndex: issue.rowIndex,
      recordId: (after.values[idField] ?? before.values[idField] ?? "").trim() || null,
      field: shown,
      message: maskSsn(issue.message),
      originalValue: shown ? safe(before.values[shown]) : null,
      finalValue: after.excluded ? null : shown ? safe(after.values[shown]) : null,
      resolution,
    })
  }

  // Changes the person made that no rule asked for.
  for (const after of finalRows) {
    const before = originalRows[after.index]
    if (!before) continue
    const id = (after.values[idField] ?? "").trim() || null
    if (after.excluded && !originalIssues.some((i) => i.rowIndex === after.index)) {
      records.push({
        rule: "excluded_by_person",
        severity: "info",
        rowIndex: after.index,
        recordId: id,
        field: null,
        message: "Row excluded by the person importing.",
        originalValue: null,
        finalValue: null,
        resolution: "excluded_row",
      })
      continue
    }
    for (const [field, value] of Object.entries(after.values)) {
      if (covered.has(`${after.index}:${field}`) || (before.values[field] ?? "") === value) continue
      records.push({
        rule: "manual_edit",
        severity: "info",
        rowIndex: after.index,
        recordId: id,
        field,
        message: "Changed by the person importing.",
        originalValue: safe(before.values[field]),
        finalValue: safe(value),
        resolution: "edited",
      })
    }
  }

  // Information that only appeared once the rows were fixed (e.g. D22 after dates were converted).
  const seen = new Set(originalIssues.map((i) => i.key))
  for (const issue of finalIssues) {
    if (issue.severity !== "info" || seen.has(issue.key) || finalRows[issue.rowIndex]?.excluded) continue
    records.push({
      rule: issue.rule,
      severity: "info",
      rowIndex: issue.rowIndex,
      recordId: (finalRows[issue.rowIndex].values[idField] ?? "").trim() || null,
      field: issue.field ?? null,
      message: maskSsn(issue.message),
      originalValue: null,
      finalValue: issue.field ? safe(finalRows[issue.rowIndex].values[issue.field]) : null,
      resolution: "info",
    })
  }
  return records
}
