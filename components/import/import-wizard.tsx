"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { ColumnMatch } from "@/lib/import/columns"
import type { ImportKind } from "@/lib/import/fields"
import type { ExistingData, ImportRow } from "@/lib/import/types"
import { cn } from "@/lib/utils"
import { ColumnStep } from "./column-step"
import { DoneStep } from "./done-step"
import { PrototypePanel } from "./prototype-panel"
import { ReviewStep } from "./review-step"
import { errorMessage, Notice, type CommitResult, type ImportSourceState, type ScanResult } from "./shared"
import { StartStep } from "./start-step"

type Step = "start" | "columns" | "review" | "done"

const STEPS: { step: Step; label: string }[] = [
  { step: "start", label: "Choose a file" },
  { step: "columns", label: "Check columns" },
  { step: "review", label: "Review and fix" },
  { step: "done", label: "Done" },
]

const MAX_BYTES = 5_000_000

function sourceBody(source: ImportSourceState) {
  return source.kind === "sample" ? { kind: "sample" } : { kind: "upload", name: source.name, text: source.text }
}

/**
 * The step-by-step import (docs/IMPORT_DESIGN.md). The browser keeps the file and the person's
 * edits; the server scans and, at the end, re-checks everything before writing anything.
 */
export function ImportWizard({ studentCount, prototypeTools }: { studentCount: number; prototypeTools: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("start")
  const [kind, setKind] = useState<ImportKind | null>(null)
  const [source, setSource] = useState<ImportSourceState | null>(null)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [matches, setMatches] = useState<ColumnMatch[]>([])
  const [rows, setRows] = useState<ImportRow[]>([])
  const [result, setResult] = useState<CommitResult | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The database snapshot from the scan, for re-checking rows in the browser as they're edited (T4).
  const ctx = useMemo(() => {
    if (!scan) return null
    const existing: ExistingData = {
      students: new Map(scan.existing.students.map((s) => [s.student_id, s])),
      notes: new Map(scan.existing.notes.map((n) => [n.note_id, n])),
    }
    return { today: scan.today, existing }
  }, [scan])

  async function runScan(k: ImportKind, src: ImportSourceState, withMatches?: ColumnMatch[]): Promise<ScanResult | null> {
    setBusy(withMatches ? "Checking every row against the import rules…" : "Reading the file…")
    setError(null)
    try {
      const response = await fetch("/api/import/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: k, source: sourceBody(src), matches: withMatches }),
      })
      if (!response.ok) {
        setError(await errorMessage(response))
        return null
      }
      return (await response.json()) as ScanResult
    } catch {
      setError("The server couldn't be reached. Check that the app is running and try again.")
      return null
    } finally {
      setBusy(null)
    }
  }

  async function start(k: ImportKind, src: ImportSourceState) {
    setKind(k)
    setSource(src)
    const result = await runScan(k, src)
    if (!result) return
    setScan(result)
    setMatches(result.matches)
    setRows(result.rows)
    setStep("columns")
  }

  async function onFile(file: File) {
    if (!kind) return
    if (file.size > MAX_BYTES) {
      setError("The file is over 5 MB. Split it and import the parts.")
      return
    }
    await start(kind, { kind: "upload", name: file.name, text: await file.text() })
  }

  async function continueToReview() {
    if (!scan || !kind || !source) return
    const changed = JSON.stringify(matches.map((m) => m.column)) !== JSON.stringify(scan.matches.map((m) => m.column))
    if (changed) {
      const result = await runScan(kind, source, matches)
      if (!result) return
      setScan(result)
      setRows(result.rows)
    }
    setStep("review")
  }

  async function commit() {
    if (!kind || !source) return
    setBusy("Importing…")
    setError(null)
    try {
      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, source: sourceBody(source), matches, rows }),
      })
      if (!response.ok) {
        const message = await errorMessage(response)
        setError(message)
        toast.error(message)
        return
      }
      setResult((await response.json()) as CommitResult)
      setStep("done")
      toast.success(`Imported ${source.name}`)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  function reset() {
    setStep("start")
    setSource(null)
    setScan(null)
    setMatches([])
    setRows([])
    setResult(null)
    setError(null)
  }

  const current = STEPS.findIndex((s) => s.step === step)

  return (
    <div className="flex flex-col gap-6">
      <ol aria-label="Import steps" className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s.step}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-[13px]",
              i === current ? "border-navy bg-navy text-white" : i < current ? "border-azurite/40 bg-cloud text-navy" : "border-border text-muted-foreground",
            )}
          >
            <span className="tabular-nums">{i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {error && (
        <Notice tone="error">
          <span role="alert">{error}</span>
        </Notice>
      )}
      {busy && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {busy}
        </p>
      )}

      {step === "start" && (
        <div className={cn("grid gap-6", prototypeTools && "xl:grid-cols-[1fr_22rem]")}>
          <section className="rounded-lg border border-border bg-card p-4">
            <StartStep
              kind={kind}
              onKindChange={setKind}
              onFile={onFile}
              studentCount={studentCount}
              busy={busy !== null}
            />
          </section>
          {prototypeTools && (
            <PrototypePanel
              studentCount={studentCount}
              busy={busy !== null}
              onUseSample={(k) => start(k, { kind: "sample", name: k === "students" ? "students.csv" : "contact_notes.csv" })}
            />
          )}
        </div>
      )}

      {step === "columns" && scan && kind && source && (
        <section className="rounded-lg border border-border bg-card p-4">
          <ColumnStep
            kind={kind}
            fileName={source.name}
            headers={scan.headers}
            preview={scan.preview}
            matches={matches}
            onChange={setMatches}
            onBack={reset}
            onContinue={continueToReview}
            busy={busy !== null}
          />
        </section>
      )}

      {step === "review" && kind && source && ctx && (
        <ReviewStep
          kind={kind}
          fileName={source.name}
          rows={rows}
          onRowsChange={setRows}
          ctx={ctx}
          onBack={() => setStep("columns")}
          onCommit={commit}
          busy={busy !== null}
        />
      )}

      {step === "done" && result && source && <DoneStep result={result} fileName={source.name} onAgain={reset} />}
    </div>
  )
}
