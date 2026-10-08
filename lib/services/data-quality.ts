import type { Db } from "@/lib/db/client"
import { RULE_TITLES, ruleTitle } from "@/lib/import/rule-titles"
import type { Severity } from "@/lib/import/types"
import type { DataQualityReport, ImportSummaryRow, RuleSummary } from "@/lib/types"

const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 }

/** Every import so far, newest first, and what each rule found and how it was resolved. */
export async function getDataQualityReport(db: Db): Promise<DataQualityReport> {
  const imports = await db.selectFrom("imports").selectAll().orderBy("created_at", "desc").execute()
  const issues = await db.selectFrom("import_issues").selectAll().orderBy("row_number").execute()

  const byRule = new Map<string, RuleSummary>()
  for (const issue of issues) {
    const summary = byRule.get(issue.rule) ?? {
      rule: issue.rule,
      title: ruleTitle(issue.rule),
      decision: RULE_TITLES[issue.rule as keyof typeof RULE_TITLES]?.decision ?? null,
      severity: issue.severity as Severity,
      count: 0,
      resolutions: {},
      records: [],
      examples: [],
    }
    summary.count++
    summary.resolutions[issue.resolution] = (summary.resolutions[issue.resolution] ?? 0) + 1
    if (issue.record_id && !summary.records.includes(issue.record_id)) summary.records.push(issue.record_id)
    if (summary.examples.length < 3) {
      summary.examples.push({
        record_id: issue.record_id,
        message: issue.message,
        original_value: issue.original_value,
        final_value: issue.final_value,
      })
    }
    if ((SEVERITY_ORDER[issue.severity] ?? 3) < (SEVERITY_ORDER[summary.severity] ?? 3)) summary.severity = issue.severity as Severity
    byRule.set(issue.rule, summary)
  }

  const count = (resolution: string) => issues.filter((i) => i.resolution === resolution).length
  return {
    imports: imports.map((i) => ({
      import_id: i.import_id,
      kind: i.kind as ImportSummaryRow["kind"],
      source_name: i.source_name,
      source_kind: i.source_kind as ImportSummaryRow["source_kind"],
      accepted_by: i.accepted_by as ImportSummaryRow["accepted_by"],
      rows_in_file: Number(i.rows_in_file),
      rows_added: Number(i.rows_added),
      rows_updated: Number(i.rows_updated),
      rows_unchanged: Number(i.rows_unchanged),
      rows_excluded: Number(i.rows_excluded),
      created_at: i.created_at,
    })),
    rules: [...byRule.values()].sort(
      (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3) || b.count - a.count,
    ),
    totals: {
      fixes_accepted: count("accepted_suggestion"),
      edited: count("edited"),
      kept_as_is: count("kept_as_is"),
      rows_excluded: imports.reduce((sum, i) => sum + Number(i.rows_excluded), 0),
      info: count("info"),
    },
  }
}
