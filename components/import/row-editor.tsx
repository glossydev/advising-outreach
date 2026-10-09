"use client"

import { Ban, Check, CornerUpLeft, Undo2 } from "lucide-react"
import { SeverityBadge } from "@/components/data-quality/issue-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatLongDate, isIsoDate } from "@/lib/import/dates"
import { FIELDS, ID_FIELD, type FieldSpec, type ImportKind } from "@/lib/import/fields"
import { acknowledge, applySuggestion, applyToAllLike, setExcluded, setValue } from "@/lib/import/resolve"
import { RULE_TITLES } from "@/lib/import/rule-titles"
import { containsSsn, maskSsn } from "@/lib/import/text"
import type { ImportRow, Issue } from "@/lib/import/types"
import { needsAttention } from "@/lib/import/validate"
import { cn } from "@/lib/utils"

function IssueCard({
  issue,
  rows,
  allIssues,
  onRowsChange,
}: {
  issue: Issue
  rows: ImportRow[]
  allIssues: Issue[]
  onRowsChange: (rows: ImportRow[]) => void
}) {
  const row = rows[issue.rowIndex]
  const kept = issue.severity === "warning" && row.acknowledged.includes(issue.key)
  const open = needsAttention(issue, rows)
  const alike = allIssues.filter(
    (i) => i.rule === issue.rule && i.field === issue.field && i.suggestions.length > 0 && needsAttention(i, rows),
  ).length
  const info = RULE_TITLES[issue.rule]

  return (
    <li className={cn("flex flex-col gap-2 rounded-md border p-3", open ? "border-border bg-card" : "border-border/60 bg-muted/40")}>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <span className="font-medium text-navy">{info.title}</span>
        <code className="text-[12px] text-muted-foreground">
          {info.decision} · {issue.rule}
        </code>
      </div>
      <p className="leading-relaxed">{issue.message}</p>
      {open && (
        <div className="flex flex-wrap gap-2">
          {issue.suggestions.map((s, i) => (
            <Button
              key={s.label}
              size="sm"
              variant={i === 0 ? "signal" : "outline"}
              // Labels such as "Import and link to S1021 as a possible duplicate" wrap instead of running out of the card.
              className={cn("h-auto min-h-7 max-w-full py-1 text-left whitespace-normal", i > 0 && "bg-card")}
              onClick={() => onRowsChange(applySuggestion(rows, issue, s))}
            >
              {s.exclude ? <Ban aria-hidden="true" /> : <Check aria-hidden="true" />}
              {s.label}
            </Button>
          ))}
          {issue.bulk && alike > 1 && (
            <Button
              size="sm"
              variant="outline"
              className="h-auto min-h-7 max-w-full bg-card py-1 text-left whitespace-normal"
              onClick={() => onRowsChange(applyToAllLike(rows, allIssues, issue))}
            >
              Apply to all {alike} like this
            </Button>
          )}
          {issue.severity === "warning" && (
            <Button size="sm" variant="ghost" onClick={() => onRowsChange(acknowledge(rows, issue))}>
              Keep it as it is
            </Button>
          )}
        </div>
      )}
      {kept && (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Kept as it is.
          <Button
            size="xs"
            variant="ghost"
            onClick={() =>
              onRowsChange(rows.map((r) => (r.index === row.index ? { ...r, acknowledged: r.acknowledged.filter((k) => k !== issue.key) } : r)))
            }
          >
            <Undo2 aria-hidden="true" /> Undo
          </Button>
        </p>
      )}
    </li>
  )
}

function FieldInput({
  field,
  value,
  invalid,
  onChange,
}: {
  field: FieldSpec
  value: string
  invalid: boolean
  onChange: (value: string) => void
}) {
  const id = `edit-${field.key}`
  if (field.type === "choice") {
    const choices = field.choices ?? []
    const items: Record<string, string> = Object.fromEntries(choices.map((c) => [c, c]))
    if (value && !choices.includes(value)) items[value] = `"${value}" (not allowed)`
    if (!value) items[""] = "(blank)"
    return (
      <Select items={items} value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger id={id} className="w-full bg-card" aria-invalid={invalid || undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([v, label]) => (
            <SelectItem key={v || "blank"} value={v}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (field.type === "longtext") {
    // D17: an SSN is never shown. Until it's removed, the text can't be edited by hand.
    if (containsSsn(value)) {
      return (
        <div className="flex flex-col gap-1">
          <Textarea id={id} value={maskSsn(value)} readOnly rows={4} aria-invalid className="bg-muted" />
          <p className="text-[12px] text-signal">Hidden: contains an SSN-shaped number. Use the fix above to remove it.</p>
        </div>
      )
    }
    return <Textarea id={id} value={value} rows={4} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} className="bg-card" />
  }
  return <Input id={id} value={value} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} className="bg-card" />
}

/** The decisions a person has made on this row (D15, D18, D19, D20), each one undoable. */
function Decisions({ kind, row, onSet }: { kind: ImportKind; row: ImportRow; onSet: (field: string, value: string) => void }) {
  const v = row.values
  const items: { label: string; field: string }[] = []
  if (kind === "students" && v.possible_duplicate_of) items.push({ label: `Linked as a possible duplicate of ${v.possible_duplicate_of}`, field: "possible_duplicate_of" })
  if (kind === "notes") {
    if (v.is_sensitive === "yes") items.push({ label: "Marked sensitive", field: "is_sensitive" })
    if (v.is_sensitive === "no") items.push({ label: "Marked not sensitive", field: "is_sensitive" })
    if (v.follow_up_date && isIsoDate(v.follow_up_date)) items.push({ label: `Follow-up date ${formatLongDate(v.follow_up_date)}`, field: "follow_up_date" })
    if (v.contact_preference) items.push({ label: `Contact preference will be saved to ${v.student_id.trim()}'s record`, field: "contact_preference" })
  }
  if (items.length === 0) return null
  return (
    <section aria-labelledby="row-decisions" className="flex flex-col gap-2">
      <h3 id="row-decisions" className="text-[13px] font-semibold tracking-wide text-navy uppercase">
        Decisions on this row
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((d) => (
          <li key={d.field} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-1.5">
            <span>{d.label}</span>
            <Button size="xs" variant="ghost" onClick={() => onSet(d.field, "")}>
              <CornerUpLeft aria-hidden="true" /> Undo
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function RowEditor({
  kind,
  rowIndex,
  rows,
  issues,
  onRowsChange,
  onOpenChange,
}: {
  kind: ImportKind
  rowIndex: number | null
  rows: ImportRow[]
  issues: Issue[]
  onRowsChange: (rows: ImportRow[]) => void
  onOpenChange: (open: boolean) => void
}) {
  const row = rowIndex === null ? null : rows[rowIndex]
  const rowIssues = row ? issues.filter((i) => i.rowIndex === row.index) : []
  const ordered = [...rowIssues].sort((a, b) => Number(needsAttention(b, rows)) - Number(needsAttention(a, rows)))

  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 overflow-y-auto shadow-xl data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {row && (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle className="text-lg font-semibold text-navy">
                Row {row.index + 2}
                {row.values[ID_FIELD[kind]] && <span className="font-mono font-normal"> · {row.values[ID_FIELD[kind]].trim()}</span>}
              </SheetTitle>
              <SheetDescription>
                {row.excluded
                  ? "This row is left out of the import."
                  : rowIssues.some((i) => needsAttention(i, rows))
                    ? "Accept a suggested fix, edit a value, keep a warning as it is, or leave the row out."
                    : "Nothing left to decide on this row."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 p-4">
              {ordered.length > 0 && (
                <section aria-labelledby="row-issues" className="flex flex-col gap-2">
                  <h3 id="row-issues" className="text-[13px] font-semibold tracking-wide text-navy uppercase">
                    What the import rules found
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {ordered.map((issue) => (
                      <IssueCard key={issue.key} issue={issue} rows={rows} allIssues={issues} onRowsChange={onRowsChange} />
                    ))}
                  </ul>
                </section>
              )}

              <Decisions kind={kind} row={row} onSet={(field, value) => onRowsChange(setValue(rows, row.index, field, value))} />

              <section aria-labelledby="row-values" className="flex flex-col gap-3">
                <h3 id="row-values" className="text-[13px] font-semibold tracking-wide text-navy uppercase">
                  Values
                </h3>
                {FIELDS[kind].map((field) => {
                  const invalid = rowIssues.some((i) => i.field === field.key && i.severity !== "info" && needsAttention(i, rows))
                  return (
                    <div key={field.key} className="flex flex-col gap-1">
                      <Label htmlFor={`edit-${field.key}`}>
                        {field.label}
                        {!field.required && <span className="font-normal text-muted-foreground"> (optional)</span>}
                      </Label>
                      <FieldInput
                        field={field}
                        value={row.values[field.key] ?? ""}
                        invalid={invalid}
                        onChange={(value) => onRowsChange(setValue(rows, row.index, field.key, value))}
                      />
                    </div>
                  )
                })}
              </section>
            </div>

            <div className="sticky bottom-0 mt-auto flex justify-between gap-2 border-t border-border bg-card p-4">
              <Button variant="outline" className="bg-card" onClick={() => onRowsChange(setExcluded(rows, row.index, !row.excluded))}>
                {row.excluded ? "Include this row again" : "Leave this row out"}
              </Button>
              <Button variant="signal" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
