"use client"

import { CircleCheck, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { missingRequired, type ColumnMatch, type MatchKind } from "@/lib/import/columns"
import { FIELDS, type ImportKind } from "@/lib/import/fields"
import { cn } from "@/lib/utils"
import { MATCH_LABELS, Notice } from "./shared"

const NOT_IMPORTED = "none"

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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">How the file&apos;s columns were matched to the fields the app needs</caption>
          <thead className="bg-cloud text-left text-[13px] text-navy">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Field</th>
              <th scope="col" className="px-3 py-2 font-semibold">Column in your file</th>
              <th scope="col" className="px-3 py-2 font-semibold">How it was matched</th>
              <th scope="col" className="px-3 py-2 font-semibold">Sample values</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const field = fields.find((f) => f.key === m.field)!
              const flagged = m.kind !== "exact" && !(m.kind === "none" && !field.required)
              const error = m.kind === "none" && field.required
              const samples = m.column === null ? [] : preview.map((r) => r[m.column!] ?? "").filter(Boolean).slice(0, 2)
              const selectId = `column-for-${m.field}`
              return (
                <tr
                  key={m.field}
                  className={cn("border-t border-border align-top", error ? "bg-signal/10" : flagged && "bg-caliche/60")}
                >
                  <td className="px-3 py-2">
                    <label htmlFor={selectId} className="flex flex-col">
                      <span className="font-medium text-navy">
                        {field.label}
                        {field.required && <span className="font-normal text-muted-foreground"> (required)</span>}
                      </span>
                      <span className="text-[12px] text-muted-foreground">{field.description}</span>
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      items={options}
                      value={m.column === null ? NOT_IMPORTED : String(m.column)}
                      onValueChange={(v) => v && choose(m.field, v)}
                    >
                      <SelectTrigger
                        id={selectId}
                        className="w-full min-w-48 bg-card"
                        aria-invalid={error || undefined}
                      >
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
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[13px]",
                        error ? "font-medium text-signal" : flagged ? "font-medium text-brick" : "text-muted-foreground",
                      )}
                    >
                      {flagged && <TriangleAlert className="size-3.5" aria-hidden="true" />}
                      {m.kind === "none" && !field.required ? "Not in this file (optional)" : MATCH_LABELS[m.kind]}
                    </span>
                  </td>
                  <td className="max-w-64 px-3 py-2 text-[13px] text-muted-foreground">
                    {samples.length ? samples.map((s, i) => <span key={i} className="block truncate font-mono">{s}</span>) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
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
