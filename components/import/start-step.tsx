"use client"

import { useId, useRef, useState } from "react"
import { FileSpreadsheet, NotebookPen, Upload, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FIELDS, type ImportKind } from "@/lib/import/fields"
import { cn } from "@/lib/utils"
import { KIND_LABELS, Notice } from "./shared"

const KIND_DETAILS: Record<ImportKind, { icon: typeof Users; description: string }> = {
  students: { icon: Users, description: "One row per student: name, major, class year, credits, GPA, advisor, risk flag." },
  notes: { icon: NotebookPen, description: "Past advising contacts, linked to students by student ID." },
}

export function StartStep({
  kind,
  onKindChange,
  onFile,
  studentCount,
  busy,
}: {
  kind: ImportKind | null
  onKindChange: (kind: ImportKind) => void
  onFile: (file: File) => void
  studentCount: number
  busy: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const groupId = useId()

  function pick(files: FileList | null) {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${groupId}-what`} className="flex flex-col gap-3">
        <h2 id={`${groupId}-what`} className="font-semibold text-navy">
          What are you importing?
        </h2>
        <div role="radiogroup" aria-labelledby={`${groupId}-what`} className="grid gap-3 sm:grid-cols-2">
          {(["students", "notes"] as const).map((k) => {
            const { icon: Icon, description } = KIND_DETAILS[k]
            const disabled = k === "notes" && studentCount === 0
            const selected = kind === k
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled || busy}
                onClick={() => onKindChange(k)}
                className={cn(
                  "flex gap-3 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                  selected ? "border-azurite bg-cloud ring-1 ring-azurite" : "border-border bg-card hover:border-arroyo",
                )}
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-azurite" aria-hidden="true" />
                <span className="flex flex-col gap-1">
                  <span className="font-medium text-navy">{KIND_LABELS[k]}</span>
                  <span className="text-[13px] leading-relaxed text-muted-foreground">{description}</span>
                  <span className="text-[12px] text-muted-foreground">
                    Columns: {FIELDS[k].map((f) => f.key).join(", ")}
                  </span>
                  {disabled && (
                    <span className="text-[12px] font-medium text-brick">
                      Import students first: notes are checked against the students already in the database.
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby={`${groupId}-file`} className="flex flex-col gap-3">
        <h2 id={`${groupId}-file`} className="font-semibold text-navy">
          Which file?
        </h2>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (kind) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (kind && !busy) pick(e.dataTransfer.files)
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center",
            dragging ? "border-arroyo bg-rain/15" : "border-border bg-muted/40",
          )}
        >
          <FileSpreadsheet className="size-8 text-shade" aria-hidden="true" />
          <p className="text-muted-foreground">
            {kind ? `Drop a ${KIND_LABELS[kind].toLowerCase()} CSV here, or` : "Choose what you're importing first."}
          </p>
          <Button variant="outline" className="bg-card" disabled={!kind || busy} onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden="true" />
            Browse for a CSV file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              pick(e.target.files)
              e.target.value = ""
            }}
          />
          <p className="text-[12px] text-muted-foreground">CSV saved from a spreadsheet, up to 5 MB. Nothing is saved until you confirm the import.</p>
        </div>
      </section>

      <Notice>
        Columns are matched automatically, even when the headers are named differently. Next you&apos;ll check the matches, then
        review anything the import rules flag before the data is saved.
      </Notice>
    </div>
  )
}
