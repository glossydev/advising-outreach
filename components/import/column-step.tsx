"use client"

import { CircleCheck, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { missingRequired, type ColumnMatch, type MatchKind } from "@/lib/import/columns"
import { FIELDS, type ImportKind } from "@/lib/import/fields"
import { cn } from "@/lib/utils"
import { MATCH_LABELS, Notice } from "./shared"

const NOT_IMPORTED = "none"

/** The four parts of a match, side by side once there's room. */
const COLUMNS_GRID = "@min-[44rem]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)]"

/** Non-exact matches first, so the eye lands on the few lines that need a look (P2). */
const ORDER: Record<MatchKind, number> = { none: 0, guess: 1, alias: 2, formatting: 3, exact: 4 }

export function ColumnStep({
  kind,
  fileName,
  headers,
  preview,
  matches,
  onChange,
  onBack,
  onContinue,
  busy,
}: {
  kind: ImportKind
  fileName: string
  headers: string[]
  preview: string[][]
  matches: ColumnMatch[]
  onChange: (matches: ColumnMatch[]) => void
  onBack: () => void
  onContinue: () => void
  busy: boolean
}) {
  const fields = FIELDS[kind]
  const missing = missingRequired(kind, matches)
  const used = new Set(matches.map((m) => m.column).filter((c) => c !== null))
  const unused = headers.filter((_, i) => !used.has(i))
  const allExact = matches.every((m) => m.kind === "exact" || (m.kind === "none" && !fields.find((f) => f.key === m.field)?.required))
  const rows = [...matches].sort((a, b) => {
    const fa = fields.find((f) => f.key === a.field)!
    const fb = fields.find((f) => f.key === b.field)!
    const rank = (m: ColumnMatch, required: boolean) => (m.kind === "none" && !required ? 5 : ORDER[m.kind])
    return rank(a, fa.required) - rank(b, fb.required) || fields.indexOf(fa) - fields.indexOf(fb)
  })
  const options: Record<string, string> = {
    [NOT_IMPORTED]: "— Not in this file —",
    ...Object.fromEntries(headers.map((h, i) => [String(i), h || `(column ${i + 1}, no header)`])),
  }

  function choose(field: string, value: string) {
    const column = value === NOT_IMPORTED ? null : Number(value)
    // Selects can report their current value again; only an actual change may update the matches.
    if (matches.find((m) => m.field === field)?.column === column) return
    onChange(
      matches.map((m) => {
        if (m.field === field) return { field, header: column === null ? null : headers[column], column, kind: column === null ? "none" : "exact" }
        // A column can feed only one field: take it away from whichever field had it.
        if (column !== null && m.column === column) return { ...m, header: null, column: null, kind: "none" }
        return m
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-navy">Check the column matches</h2>
        <p className="text-[13px] text-muted-foreground">
          <span className="font-mono">{fileName}</span>: {headers.length} columns. Each field the app needs has been matched to a
          column automatically. Anything that isn&apos;t an exact header match is highlighted and listed first.
        </p>
      </div>

      {allExact && missing.length === 0 ? (
        <Notice tone="success">
          <span className="flex items-center gap-2 font-medium text-navy">
            <CircleCheck className="size-4 text-saguaro-strong" aria-hidden="true" />
            All {matches.filter((m) => m.kind === "exact").length} columns matched exactly. Nothing to check here.
          </span>
        </Notice>
      ) : missing.length > 0 ? (
        <Notice tone="error">
          Pick a column for {missing.length === 1 ? "this required field" : `these ${missing.length} required fields`} before
          continuing: {missing.map((k) => fields.find((f) => f.key === k)?.label).join(", ")}.
        </Notice>
      ) : null}

      {/*
        One list for every width: from 44rem of room the four parts of each match sit side by side under column
        headings, like a table; narrower, they stack, each with its own label. The headings are visual only: screen
        readers get the same labels at every width.
      */}
      <div className="@container rounded-lg border border-border">
        <div
          aria-hidden="true"
          className={cn(
            COLUMNS_GRID,
            "hidden gap-x-4 rounded-t-lg border-b border-border bg-cloud px-3 py-2 text-[13px] font-semibold text-navy @min-[44rem]:grid",
          )}
        >
          <span>Field</span>
          <span>Column in your file</span>
          <span>How it was matched</span>
          <span>Sample values</span>
        </div>
        <ul aria-label="How the file's columns were matched to the fields the app needs">
          {rows.map((m, index) => {
            const field = fields.find((f) => f.key === m.field)!
            const flagged = m.kind !== "exact" && !(m.kind === "none" && !field.required)
            const error = m.kind === "none" && field.required
            const samples = m.column === null ? [] : preview.map((r) => r[m.column!] ?? "").filter(Boolean).slice(0, 2)
            const selectId = `column-for-${m.field}`
            return (
              <li
                key={m.field}
                className={cn(
                  "grid gap-x-4 gap-y-2 px-3 py-2.5 @min-[44rem]:items-start",
                  COLUMNS_GRID,
                  index > 0 && "border-t border-border",
                  index === rows.length - 1 && "rounded-b-lg",
                  error ? "bg-signal/10" : flagged && "bg-caliche/60",
                )}
              >
                <label htmlFor={selectId} className="flex flex-col">
                  <span className="font-medium text-navy">
                    {field.label}
                    {field.required && <span className="font-normal text-muted-foreground"> (required)</span>}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{field.description}</span>
                </label>
                <Select items={options} value={m.column === null ? NOT_IMPORTED : String(m.column)} onValueChange={(v) => v && choose(m.field, v)}>
                  <SelectTrigger id={selectId} className="w-full min-w-0 bg-card" aria-invalid={error || undefined}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(options).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Stacked, these two share a row when there's room; side by side, they're the last two columns. */}
                <div className="grid gap-2 @min-[24rem]:grid-cols-2 @min-[44rem]:contents">
                <p className="flex flex-col gap-0.5 text-[13px]">
                  <span className="text-[12px] text-muted-foreground @min-[44rem]:sr-only">How it was matched</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      error ? "font-medium text-signal" : flagged ? "font-medium text-brick" : "text-muted-foreground",
                    )}
                  >
                    {flagged && <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
                    {m.kind === "none" && !field.required ? "Not in this file (optional)" : MATCH_LABELS[m.kind]}
                  </span>
                </p>
                <div className="flex min-w-0 flex-col gap-0.5 text-[13px] text-muted-foreground">
                  <span className="text-[12px] @min-[44rem]:sr-only">Sample values</span>
                  {samples.length ? (
                    samples.map((s, i) => (
                      <span key={i} className="block truncate font-mono" title={s}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {unused.length > 0 && (
        <p className="text-[13px] text-muted-foreground">
          Not imported (no matching field): {unused.map((h, i) => <span key={i} className="mr-1 font-mono">{h || "(blank header)"}</span>)}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" className="bg-card" onClick={onBack} disabled={busy}>
          Choose a different file
        </Button>
        <Button variant="signal" onClick={onContinue} disabled={busy || missing.length > 0}>
          {busy ? "Checking the rows…" : "Continue to review"}
        </Button>
      </div>
    </div>
  )
}
