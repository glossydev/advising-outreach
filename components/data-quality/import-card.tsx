"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { runImportAction, type ImportActionState } from "@/app/actions"
import { cn } from "@/lib/utils"

type Slot = "students" | "notes"

const SLOT_NAMES: Record<Slot, string> = { students: "students.csv", notes: "contact_notes.csv" }

function slotFor(file: File): Slot | null {
  const name = file.name.toLowerCase()
  if (name.includes("note")) return "notes"
  if (name.includes("student")) return "students"
  return null
}

export function ImportCard({ summaryLine }: { summaryLine: string }) {
  const [state, formAction, pending] = useActionState<ImportActionState, FormData>(runImportAction, { status: "idle" })
  const [files, setFiles] = useState<Partial<Record<Slot, File>>>({})
  const [dragging, setDragging] = useState(false)
  const studentsInput = useRef<HTMLInputElement>(null)
  const notesInput = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message)
      setFiles({})
      formRef.current?.reset()
    }
  }, [state])

  function assign(slot: Slot, file: File | undefined) {
    const input = slot === "students" ? studentsInput.current : notesInput.current
    if (input) {
      const dt = new DataTransfer()
      if (file) dt.items.add(file)
      input.files = dt.files
    }
    setFiles((prev) => ({ ...prev, [slot]: file }))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith(".csv"))
    const unassigned: File[] = []
    for (const f of dropped) {
      const slot = slotFor(f)
      if (slot) assign(slot, f)
      else unassigned.push(f)
    }
    for (const f of unassigned) {
      if (!files.students) assign("students", f)
      else if (!files.notes) assign("notes", f)
    }
  }

  return (
    <section aria-labelledby="import-heading" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="import-heading" className="font-semibold text-navy">
          Upload students.csv and contact_notes.csv
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Running an import replaces all prototype data, including contacts logged in this session. Run with no files to
          re-seed the sample data.
        </p>
      </div>

      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "grid gap-3 rounded-md border-2 border-dashed p-4 sm:grid-cols-2",
            dragging ? "border-arroyo bg-rain/15" : "border-border bg-muted/40",
          )}
        >
          {(["students", "notes"] as const).map((slot) => {
            const file = files[slot]
            const ref = slot === "students" ? studentsInput : notesInput
            const id = `import-${slot}`
            return (
              <div key={slot} className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-[13px] font-medium text-foreground">
                  {SLOT_NAMES[slot]}
                  {slot === "notes" && <span className="font-normal text-muted-foreground"> (optional)</span>}
                </label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <FileSpreadsheet className="size-4 shrink-0 text-shade" aria-hidden="true" />
                  <span className={cn("min-w-0 flex-1 truncate", !file && "text-muted-foreground")}>
                    {file ? file.name : "No file chosen"}
                  </span>
                  {file ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => assign(slot, undefined)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
                      Browse
                    </Button>
                  )}
                </div>
                <input
                  ref={ref}
                  id={id}
                  name={slot}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => setFiles((prev) => ({ ...prev, [slot]: e.target.files?.[0] }))}
                />
              </div>
            )
          })}
          <p className="text-[13px] text-muted-foreground sm:col-span-2">
            Or drag both files here. Files are matched by name.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted-foreground tabular-nums">{summaryLine}</p>
          <Button type="submit" variant="signal" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {files.students || files.notes ? "Run import" : "Re-seed sample data"}
          </Button>
        </div>
        <p role="alert" className="text-[13px] font-medium text-signal empty:hidden">
          {state.status === "error" ? state.message : ""}
        </p>
      </form>
    </section>
  )
}
