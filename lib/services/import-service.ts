import { createHash, randomUUID } from "node:crypto"
import { TODAY_ISO } from "@/lib/config"
import type { Db } from "@/lib/db/client"
import { buildRows, missingRequired, type ColumnMatch } from "@/lib/import/columns"
import { parseCsv } from "@/lib/import/csv"
import { FIELDS, fieldLabel, type ImportKind } from "@/lib/import/fields"
import { buildFixHistory } from "@/lib/import/history"
import { buildCommitPlan, type StudentWrite } from "@/lib/import/plan"
import type { ImportRow, Issue } from "@/lib/import/types"
import { validateRows } from "@/lib/import/validate"
import { loadExistingData } from "./existing-data"

export interface ImportSource {
  /** File name as uploaded, e.g. "students.csv". */
  name: string
  kind: "upload" | "sample" | "seed"
  text: string
}

export interface CommitInput {
  kind: ImportKind
  source: ImportSource
  matches: readonly ColumnMatch[]
  /** The rows after the person's review, in file order. */
  rows: readonly ImportRow[]
  acceptedBy: "person" | "seed"
  /** Reference "today"; defaults to the app's. */
  today?: string
}

export interface CommitResult {
  importId: string
  kind: ImportKind
  added: number
  updated: number
  unchanged: number
  excluded: number
  /** How many recorded fixes each rule produced. */
  fixesByRule: Record<string, number>
}

export class ImportError extends Error {
  constructor(
    readonly code: "missing_columns" | "rows_mismatch" | "blocking_issues" | "empty_file" | "file_too_large" | "invalid_file",
    message: string,
    readonly issues: Issue[] = [],
  ) {
    super(message)
    this.name = "ImportError"
  }
}

const now = () => new Date().toISOString()

/**
 * Commits a reviewed import. The server doesn't trust the browser's account of what changed: it
 * re-reads the original file, re-runs every rule on the reviewed rows, refuses anything still
 * blocking, and works out the fix history itself. Everything is written in one transaction.
 */
export async function commitImport(db: Db, input: CommitInput): Promise<CommitResult> {
  const { kind, source, matches, rows, acceptedBy } = input
  const today = input.today ?? TODAY_ISO

  const missing = missingRequired(kind, matches)
  if (missing.length > 0) {
    throw new ImportError("missing_columns", `No column was matched to: ${missing.map((k) => fieldLabel(kind, k)).join(", ")}.`)
  }
  const knownFields = new Set(FIELDS[kind].map((f) => f.key))
  if (matches.some((m) => !knownFields.has(m.field))) throw new ImportError("missing_columns", "Unknown field in column matches.")

  const table = parseCsv(source.text)
  if (table.records.length === 0) throw new ImportError("empty_file", "The file has no data rows.")
  const originalRows = buildRows(kind, table, matches)
  if (rows.length !== originalRows.length || rows.some((r, i) => r.index !== i)) {
    throw new ImportError("rows_mismatch", "The reviewed rows don't line up with the file. Start the import again.")
  }

  const ctx = { today, existing: await loadExistingData(db) }
  const originalIssues = validateRows(kind, originalRows, ctx)
  const finalIssues = validateRows(kind, rows, ctx)
  const plan = buildCommitPlan(kind, rows, finalIssues, ctx)
  if (plan.blocking.length > 0) {
    throw new ImportError(
      "blocking_issues",
      `${plan.blocking.length} issue${plan.blocking.length === 1 ? "" : "s"} must be fixed, or the rows excluded, before importing.`,
      plan.blocking,
    )
  }
  const fixes = buildFixHistory(kind, originalRows, originalIssues, rows, finalIssues)

  const importId = randomUUID()
  const stamp = now()
  const studentValues = (w: StudentWrite) => ({
    first_name: w.first_name,
    last_name: w.last_name,
    email: w.email,
    major: w.major,
    class_year: w.class_year,
    credits_earned: w.credits_earned,
    gpa: w.gpa,
    advisor: w.advisor,
    risk_flag: w.risk_flag,
    source_last_contact_date: w.source_last_contact_date,
    import_id: importId,
    updated_at: stamp,
  })

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("imports")
      .values({
        import_id: importId,
        kind,
        source_name: source.name,
        source_kind: source.kind,
        source_sha256: createHash("sha256").update(source.text).digest("hex"),
        accepted_by: acceptedBy,
        column_mapping: JSON.stringify(matches.map(({ field, header, kind: match }) => ({ field, header, kind: match }))),
        rows_in_file: rows.length,
        rows_added: plan.studentInserts.length + plan.noteInserts.length,
        rows_updated: plan.studentUpdates.length,
        rows_unchanged: plan.unchanged.length,
        rows_excluded: plan.excludedRows.length,
        created_at: stamp,
      })
      .execute()

    for (const w of plan.studentInserts) {
      await trx
        .insertInto("students")
        .values({
          student_id: w.student_id,
          ...studentValues(w),
          contact_preference: null,
          possible_duplicate_of: w.possible_duplicate_of,
          created_at: stamp,
        })
        .execute()
    }
    for (const { write: w } of plan.studentUpdates) {
      await trx
        .updateTable("students")
        .set({ ...studentValues(w), ...(w.possible_duplicate_of ? { possible_duplicate_of: w.possible_duplicate_of } : {}) })
        .where("student_id", "=", w.student_id)
        .execute()
    }
    for (const n of plan.noteInserts) {
      await trx
        .insertInto("contact_notes")
        .values({
          ...n,
          is_sensitive: n.is_sensitive ? 1 : 0,
          source: "import",
          import_id: importId,
          created_at: stamp,
        })
        .execute()
    }
    for (const { student_id, preference } of plan.preferences) {
      await trx
        .updateTable("students")
        .set({ contact_preference: JSON.stringify(preference), updated_at: stamp })
        .where("student_id", "=", student_id)
        .execute()
    }
    for (let i = 0; i < fixes.length; i += 100) {
      await trx
        .insertInto("import_issues")
        .values(
          fixes.slice(i, i + 100).map((f) => ({
            id: randomUUID(),
            import_id: importId,
            rule: f.rule,
            severity: f.severity,
            row_number: f.rowIndex + 2,
            record_id: f.recordId,
            field: f.field,
            message: f.message,
            original_value: f.originalValue,
            final_value: f.finalValue,
            resolution: f.resolution,
          })),
        )
        .execute()
    }
  })

  const fixesByRule: Record<string, number> = {}
  for (const f of fixes) fixesByRule[f.rule] = (fixesByRule[f.rule] ?? 0) + 1
  return {
    importId,
    kind,
    added: plan.studentInserts.length + plan.noteInserts.length,
    updated: plan.studentUpdates.length,
    unchanged: plan.unchanged.length,
    excluded: plan.excludedRows.length,
    fixesByRule,
  }
}
