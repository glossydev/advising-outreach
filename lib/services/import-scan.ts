import { createHash } from "node:crypto"
import { TODAY_ISO } from "@/lib/config"
import type { Db } from "@/lib/db/client"
import { buildRows, matchColumns, missingRequired, unusedHeaders, type ColumnMatch } from "@/lib/import/columns"
import { parseCsv } from "@/lib/import/csv"
import { FIELDS, type ImportKind } from "@/lib/import/fields"
import type { ExistingNote, ExistingStudent, ImportRow, Issue } from "@/lib/import/types"
import { validateRows } from "@/lib/import/validate"
import { loadExistingData } from "./existing-data"
import { ImportError, type ImportSource } from "./import-service"

/** The largest CSV the importer accepts. */
export const MAX_IMPORT_BYTES = 5_000_000

export interface ScanResult {
  kind: ImportKind
  source: { name: string; kind: ImportSource["kind"]; sha256: string; bytes: number }
  headers: string[]
  matches: ColumnMatch[]
  unusedHeaders: string[]
  missingRequired: string[]
  rows: ImportRow[]
  issues: Issue[]
  /** What's already in the database, so the browser can re-check rows as they're edited (T4). */
  existing: { students: ExistingStudent[]; notes: ExistingNote[] }
  today: string
}

/**
 * Step one of an import: read the file, match its columns, and run every rule. Nothing is written.
 * Pass `matches` to re-scan with the person's own column choices.
 */
export async function scanImport(
  db: Db,
  kind: ImportKind,
  source: ImportSource,
  matches?: ColumnMatch[],
  today = TODAY_ISO,
): Promise<ScanResult> {
  const bytes = Buffer.byteLength(source.text)
  if (bytes > MAX_IMPORT_BYTES) throw new ImportError("file_too_large", "The file is over 5 MB. Split it and import the parts.")
  let table: ReturnType<typeof parseCsv>
  try {
    table = parseCsv(source.text)
  } catch {
    throw new ImportError("invalid_file", "This file couldn't be read as CSV. Save it from your spreadsheet as CSV and try again.")
  }
  if (table.headers.length === 0 || table.records.length === 0) throw new ImportError("empty_file", "The file has no data rows.")

  const columns = matches ?? matchColumns(table.headers, FIELDS[kind])
  const rows = buildRows(kind, table, columns)
  const existing = await loadExistingData(db)
  const missing = missingRequired(kind, columns)
  return {
    kind,
    source: { name: source.name, kind: source.kind, sha256: createHash("sha256").update(source.text).digest("hex"), bytes },
    headers: table.headers,
    matches: columns,
    unusedHeaders: unusedHeaders(table.headers, columns),
    missingRequired: missing,
    rows,
    // Rules run once every required field has a column; until then the column step comes first.
    issues: missing.length === 0 ? validateRows(kind, rows, { today, existing }) : [],
    existing: { students: [...existing.students.values()], notes: [...existing.notes.values()] },
    today,
  }
}
