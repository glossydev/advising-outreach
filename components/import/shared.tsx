import type { MatchKind } from "@/lib/import/columns"
import type { ImportKind } from "@/lib/import/fields"
import type { Severity } from "@/lib/import/types"
import type { CommitResult } from "@/lib/services/import-service"
import type { ScanResult } from "@/lib/services/import-scan"
import { cn } from "@/lib/utils"

/** What the browser keeps of the file between steps. The server keeps nothing (IMPORT_DESIGN, "How it fits together"). */
export type ImportSourceState = { kind: "upload"; name: string; text: string } | { kind: "sample"; name: string }

export type { CommitResult, ScanResult }

export const KIND_LABELS: Record<ImportKind, string> = { students: "Students", notes: "Contact notes" }

export const MATCH_LABELS: Record<MatchKind, string> = {
  exact: "Exact match",
  formatting: "Same name, different formatting",
  alias: "Known alternative name",
  guess: "Best guess: check this",
  none: "Not matched",
}

/** Highlight for a cell or row by its worst open issue. */
export const SEVERITY_CELL: Record<Severity, string> = {
  error: "bg-signal/10 outline outline-1 -outline-offset-1 outline-signal/60",
  warning: "bg-caliche/70 outline outline-1 -outline-offset-1 outline-brick/40",
  info: "bg-rain/15",
}

export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warning" | "error" | "success"
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-[13px] leading-relaxed",
        tone === "info" && "border-azurite/30 bg-cloud text-navy",
        tone === "warning" && "border-amber/50 bg-caliche/60 text-foreground",
        tone === "error" && "border-signal/50 bg-signal/10 text-foreground",
        tone === "success" && "border-saguaro/50 bg-card text-foreground",
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The API's error shape, as a readable message. */
export async function errorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
  return body?.error?.message ?? `Something went wrong (HTTP ${response.status}).`
}
