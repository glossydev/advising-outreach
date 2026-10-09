"use client"

import { useMemo, useState } from "react"
import { CircleAlert, CircleCheck, Sparkles, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatLongDate, isIsoDate } from "@/lib/import/dates"
import { FIELDS, type ImportKind } from "@/lib/import/fields"
import { buildCommitPlan } from "@/lib/import/plan"
import { applySuggestion, applyToAllLike } from "@/lib/import/resolve"
import { RULE_TITLES } from "@/lib/import/rule-titles"
import { maskSsn } from "@/lib/import/text"
import type { ImportRow, Issue, RuleContext, RuleName, Severity } from "@/lib/import/types"
import { blockingIssues, needsAttention, validateRows } from "@/lib/import/validate"
import { cn } from "@/lib/utils"
import { RowEditor } from "./row-editor"
import { Notice, SEVERITY_CELL } from "./shared"

type View = "attention" | "all" | "excluded"
const ALL_RULES = "all"
const MAX_SHOWN = 200
const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 }

function worst(issues: Issue[]): Severity | null {
  return issues.reduce<Severity | null>((w, i) => (w === null || RANK[i.severity] < RANK[w] ? i.severity : w), null)
}

/** Accept every open issue's recommended fix, except "exclude": leaving a row out is a person's call. */
function acceptSuggestedFixes(kind: ImportKind, rows: ImportRow[], ctx: Omit<RuleContext, "kind">): ImportRow[] {
  let current = rows
  for (let pass = 0; pass < 5; pass++) {
    const pending = validateRows(kind, current, ctx).filter(
      (i) => needsAttention(i, current) && i.suggestions.length > 0 && !i.suggestions[0].exclude,
    )
    if (pending.length === 0) break
    for (const issue of pending) current = applySuggestion(current, issue, issue.suggestions[0])
  }
  return current
}

function DecisionChips({ kind, row }: { kind: ImportKind; row: ImportRow }) {
  const v = row.values
  const chips: string[] = []
  if (kind === "students" && v.possible_duplicate_of) chips.push(`Linked to ${v.possible_duplicate_of}`)
  if (kind === "notes") {
    if (v.is_sensitive === "yes") chips.push("Sensitive")
    if (v.follow_up_date && isIsoDate(v.follow_up_date)) chips.push(`Follow up ${formatLongDate(v.follow_up_date)}`)
    if (v.contact_preference) chips.push("Saves preference")
  }
  if (chips.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span key={c} className="rounded border border-azurite/30 bg-cloud px-1.5 py-0.5 text-[12px] whitespace-nowrap text-navy">
          {c}
        </span>
      ))}
    </span>
  )
}

export function ReviewStep({
  kind,
  fileName,
  rows,
  onRowsChange,
  ctx,
  onBack,
  onCommit,
  busy,
}: {
  kind: ImportKind
  fileName: string
  rows: ImportRow[]
  onRowsChange: (rows: ImportRow[]) => void
  ctx: Omit<RuleContext, "kind">
  onBack: () => void
  onCommit: () => void
  busy: boolean
}) {
  const fields = FIELDS[kind]
  const issues = useMemo(() => validateRows(kind, rows, ctx), [kind, rows, ctx])
  const open = issues.filter((i) => needsAttention(i, rows))
  const blocking = blockingIssues(issues, rows)
  const blockingRows = new Set(blocking.map((i) => i.rowIndex))
  const excluded = rows.filter((r) => r.excluded).length
  const warningsOpen = open.filter((i) => i.severity === "warning").length
  const ready = rows.filter((r) => !r.excluded && !blockingRows.has(r.index)).length
  const suggestedFixes = open.filter((i) => i.suggestions.length > 0 && !i.suggestions[0].exclude).length

  const [view, setView] = useState<View>(open.length > 0 ? "attention" : "all")
  const [rule, setRule] = useState<string>(ALL_RULES)
  const [editing, setEditing] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  const ruleCounts = new Map<RuleName, number>()
  for (const i of open) ruleCounts.set(i.rule, (ruleCounts.get(i.rule) ?? 0) + 1)
  const ruleItems: Record<string, string> = {
    [ALL_RULES]: "All rules",
    ...Object.fromEntries([...ruleCounts].map(([r, n]) => [r, `${RULE_TITLES[r].title} (${n})`])),
  }
  const activeRule = rule !== ALL_RULES && ruleCounts.has(rule as RuleName) ? (rule as RuleName) : null
  const ruleBulk = activeRule ? open.find((i) => i.rule === activeRule && i.bulk && i.suggestions.length > 0) : undefined

  const visible = rows.filter((r) => {
    if (view === "excluded") return r.excluded
    if (view === "attention" && !open.some((i) => i.rowIndex === r.index)) return false
    if (activeRule && !open.some((i) => i.rowIndex === r.index && i.rule === activeRule)) return false
    return true
  })

  const plan = confirming ? buildCommitPlan(kind, rows, issues, ctx) : null
  const keptWarnings = issues.filter((i) => i.severity === "warning" && !rows[i.rowIndex]?.excluded).length

  const tabs: { value: View; label: string; count: number }[] = [
    { value: "attention", label: "Needs attention", count: new Set(open.map((i) => i.rowIndex)).size },
    { value: "all", label: "All rows", count: rows.length },
    { value: "excluded", label: "Left out", count: excluded },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-navy">Review and fix</h2>
        <p className="text-[13px] text-muted-foreground">
          <span className="font-mono">{fileName}</span>: {rows.length} rows. Highlighted cells were flagged by an import rule. Open
          a row to see why, accept the suggested fix, edit the value, or leave the row out. Nothing is saved until you import.
        </p>
      </div>

      <dl aria-label="Review summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Ready to import", value: ready, tone: "text-navy", icon: CircleCheck },
          { label: "Rows with blocking issues", value: blockingRows.size, tone: blockingRows.size ? "text-signal" : "text-navy", icon: CircleAlert },
          { label: "Warnings to review", value: warningsOpen, tone: warningsOpen ? "text-brick" : "text-navy", icon: TriangleAlert },
          { label: "Rows left out", value: excluded, tone: "text-navy", icon: CircleAlert },
        ].map(({ label, value, tone }) => (
          <div key={label} className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
            <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
            <dd className={cn("text-2xl leading-none font-semibold tabular-nums", tone)}>{value}</dd>
          </div>
        ))}
      </dl>

      {suggestedFixes > 0 && (
        <Notice className="flex flex-wrap items-center justify-between gap-3">
          <span>
            {suggestedFixes} flagged value{suggestedFixes === 1 ? " has" : "s have"} a suggested fix (date formats, spelling, removing an
            SSN, and so on). Accept them all at once, or one at a time.
          </span>
          <Button size="sm" variant="signal" onClick={() => onRowsChange(acceptSuggestedFixes(kind, rows, ctx))}>
            <Sparkles aria-hidden="true" />
            Accept all suggested fixes
          </Button>
        </Notice>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="Which rows to show" className="flex rounded-lg border border-border bg-card p-0.5">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={view === t.value}
              onClick={() => setView(t.value)}
              className={cn(
                "rounded-md px-3 py-1 text-[13px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                view === t.value ? "bg-navy text-white" : "text-muted-foreground hover:text-navy",
              )}
            >
              {t.label} <span className="tabular-nums">({t.count})</span>
            </button>
          ))}
        </div>
        {ruleCounts.size > 0 && view !== "excluded" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="rule-filter" className="text-[13px] font-medium text-muted-foreground">
              Issue type
            </label>
            <Select items={ruleItems} value={activeRule ?? ALL_RULES} onValueChange={(v) => setRule(v ?? ALL_RULES)}>
              <SelectTrigger id="rule-filter" className="min-w-64 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ruleItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {ruleBulk && (
          <Button variant="outline" className="bg-card" onClick={() => onRowsChange(applyToAllLike(rows, issues, ruleBulk))}>
            Apply the suggested fix to all {ruleCounts.get(activeRule!)}
          </Button>
        )}
      </div>

      <div className="relative overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[960px] border-collapse text-[13px]">
          <caption className="sr-only">
            Rows in the file. Flagged cells are highlighted; open a row to review it.
          </caption>
          <thead className="bg-cloud text-left text-navy">
            <tr>
              <th scope="col" className="px-2 py-2 font-semibold">Row</th>
              {fields.map((f) => (
                <th key={f.key} scope="col" className="px-2 py-2 font-semibold whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th scope="col" className="px-2 py-2 font-semibold">Decisions</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, MAX_SHOWN).map((row) => {
              const rowOpen = open.filter((i) => i.rowIndex === row.index)
              const rowSeverity = worst(rowOpen)
              const rowLevel = rowOpen.filter((i) => !i.field)
              return (
                <tr
                  key={row.index}
                  onClick={() => setEditing(row.index)}
                  className={cn(
                    "cursor-pointer border-t border-border align-top hover:bg-muted/60",
                    row.excluded && "text-muted-foreground line-through decoration-muted-foreground/60",
                    rowSeverity === "error" && "border-l-4 border-l-signal",
                    rowSeverity === "warning" && "border-l-4 border-l-brick/60",
                  )}
                >
                  <td className={cn("px-2 py-1.5 whitespace-nowrap", rowLevel.length > 0 && SEVERITY_CELL[worst(rowLevel)!])}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(row.index)
                      }}
                      aria-label={`Review row ${row.index + 2}${rowOpen.length ? `: ${rowOpen.length} issue${rowOpen.length === 1 ? "" : "s"} to review` : ""}${row.excluded ? ", left out" : ""}`}
                      className="rounded px-1 font-mono tabular-nums text-azurite no-underline outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {row.index + 2}
                    </button>
                    {rowOpen.length > 0 && (
                      <span className="ml-1 rounded-full bg-navy px-1.5 text-[11px] font-medium text-white no-underline" aria-hidden="true">
                        {rowOpen.length}
                      </span>
                    )}
                  </td>
                  {fields.map((f) => {
                    const cellIssues = rowOpen.filter((i) => i.field === f.key)
                    const severity = worst(cellIssues)
                    const raw = row.values[f.key] ?? ""
                    const shown = f.type === "longtext" ? maskSsn(raw) : raw
                    return (
                      <td
                        key={f.key}
                        title={cellIssues.map((i) => i.message).join("\n") || undefined}
                        className={cn("max-w-56 px-2 py-1.5", severity && SEVERITY_CELL[severity], f.type === "longtext" && "min-w-64")}
                      >
                        <span className={cn("block truncate", f.type === "longtext" && "line-clamp-2 whitespace-normal")}>
                          {raw.trim() === "" ? <span className="text-muted-foreground italic">blank</span> : shown}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5">
                    <DecisionChips kind={kind} row={row} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-muted-foreground">
            {view === "attention" ? "Nothing left to review. Every row is ready or left out." : "No rows here."}
          </p>
        )}
        {visible.length > MAX_SHOWN && (
          <p className="border-t border-border px-4 py-2 text-[13px] text-muted-foreground">
            Showing the first {MAX_SHOWN} of {visible.length} rows. Use the issue-type filter to narrow the list.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
        <Button variant="outline" className="bg-card" onClick={onBack} disabled={busy}>
          Back to the column matches
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          {blockingRows.size > 0 && (
            <p className="text-[13px] font-medium text-signal">
              Fix or leave out {blockingRows.size === 1 ? "the row" : `the ${blockingRows.size} rows`} with blocking issues to continue.
            </p>
          )}
          <Button variant="signal" disabled={busy || blockingRows.size > 0 || ready === 0} onClick={() => setConfirming(true)}>
            Import {ready} row{ready === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      <RowEditor
        kind={kind}
        rowIndex={editing}
        rows={rows}
        issues={issues}
        onRowsChange={onRowsChange}
        onOpenChange={(o) => !o && setEditing(null)}
      />

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import {fileName}?</AlertDialogTitle>
            <AlertDialogDescription render={<div />}>
              {plan && (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-left">
                  {kind === "students" ? (
                    <>
                      <li>{plan.studentInserts.length} new student{plan.studentInserts.length === 1 ? "" : "s"} added</li>
                      <li>{plan.studentUpdates.length} existing student{plan.studentUpdates.length === 1 ? "" : "s"} updated</li>
                    </>
                  ) : (
                    <>
                      <li>{plan.noteInserts.length} new note{plan.noteInserts.length === 1 ? "" : "s"} added</li>
                      {plan.preferences.length > 0 && <li>{plan.preferences.length} contact preference{plan.preferences.length === 1 ? "" : "s"} saved to students</li>}
                    </>
                  )}
                  <li>{plan.unchanged.length} already up to date (skipped)</li>
                  {plan.excludedRows.length > 0 && <li>{plan.excludedRows.length} left out</li>}
                  {keptWarnings > 0 && <li>{keptWarnings} warning{keptWarnings === 1 ? "" : "s"} imported as {keptWarnings === 1 ? "it is" : "they are"}</li>}
                  <li>Nothing is deleted, and every fix is recorded on the Data Quality page.</li>
                </ul>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-signal text-signal-foreground hover:bg-signal/90"
              onClick={() => {
                setConfirming(false)
                onCommit()
              }}
            >
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
