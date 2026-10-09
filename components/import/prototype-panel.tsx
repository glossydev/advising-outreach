"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DatabaseZap, FlaskConical, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import type { ImportKind } from "@/lib/import/fields"
import { errorMessage } from "./shared"

type Confirm = "reset" | "reload" | null

/**
 * Prototype-only tools (IMPORT_DESIGN, "Prototype-only panel"): the hiring team's sample files
 * without uploading them, and a way back to an empty or freshly seeded database.
 */
export function PrototypePanel({
  onUseSample,
  studentCount,
  busy,
}: {
  onUseSample: (kind: ImportKind) => void
  studentCount: number
  busy: boolean
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [working, setWorking] = useState(false)

  async function run(action: Exclude<Confirm, null>) {
    setWorking(true)
    const response = await fetch(action === "reset" ? "/api/prototype/reset" : "/api/prototype/reload-sample", { method: "POST" })
    setWorking(false)
    setConfirm(null)
    if (!response.ok) {
      toast.error(await errorMessage(response))
      return
    }
    toast.success(action === "reset" ? "The database is empty." : "Sample data reloaded: 50 students, 57 notes.")
    router.refresh()
  }

  return (
    <aside
      aria-labelledby="prototype-heading"
      className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-amber/70 bg-caliche/40 p-4"
    >
      <div className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-brick" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <h2 id="prototype-heading" className="font-semibold text-navy">
            Prototype only
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Not part of a production build. These tools make it easy to try the importer with the sample files from the hiring
            team, without hunting for them.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-foreground">Import a sample file</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="bg-card" disabled={busy || working} onClick={() => onUseSample("students")}>
            Use the sample students.csv
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            disabled={busy || working || studentCount === 0}
            onClick={() => onUseSample("notes")}
          >
            Use the sample contact_notes.csv
          </Button>
        </div>
        {studentCount > 0 && (
          <p className="text-[12px] text-muted-foreground">
            The sample data is already loaded, so these will show every row as &ldquo;already in the database&rdquo;. Reset first to
            watch the import rules work on a clean database.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-amber/40 pt-3">
        <p className="text-[13px] font-medium text-foreground">Start over</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="bg-card" disabled={busy || working} onClick={() => setConfirm("reset")}>
            <DatabaseZap aria-hidden="true" />
            Reset the database to empty
          </Button>
          <Button variant="outline" size="sm" className="bg-card" disabled={busy || working} onClick={() => setConfirm("reload")}>
            <RotateCcw aria-hidden="true" />
            Reload the sample data
          </Button>
        </div>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "reset" ? "Empty the database?" : "Reload the sample data?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reset"
                ? "Every student, note and import record will be deleted, including contacts logged in the app. The sample files themselves are not changed."
                : "Everything in the database is replaced with the hiring team's sample files, imported with every suggested fix accepted. Contacts logged in the app will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-signal text-signal-foreground hover:bg-signal/90"
              disabled={working}
              onClick={() => confirm && run(confirm)}
            >
              {working ? "Working…" : confirm === "reset" ? "Empty the database" : "Reload the sample data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
