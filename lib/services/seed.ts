import { readFileSync } from "node:fs"
import path from "node:path"
import { TODAY_ISO } from "@/lib/config"
import type { Db } from "@/lib/db/client"
import { buildRows, matchColumns } from "@/lib/import/columns"
import { parseCsv } from "@/lib/import/csv"
import { FIELDS, type ImportKind } from "@/lib/import/fields"
import { acceptAllSuggestions } from "@/lib/import/resolve"
import { commitImport, type CommitResult, type ImportSource } from "./import-service"
import { loadExistingData } from "./existing-data"

/** The hiring team's files, never modified (CLAUDE.md). */
export const SAMPLE_FILES: Record<ImportKind, string> = {
  students: "data/source/students.csv",
  notes: "data/source/contact_notes.csv",
}

export function readSampleFile(kind: ImportKind, sourceKind: ImportSource["kind"] = "sample"): ImportSource {
  const file = path.join(process.cwd(), SAMPLE_FILES[kind])
  return { name: path.basename(file), kind: sourceKind, text: readFileSync(file, "utf8") }
}

/**
 * Imports a file the way a person would if they accepted every recommended fix (DECISIONS T5):
 * same column matching, same rules, same commit and fix history; only the clicks are automated.
 */
export async function importAcceptingAll(db: Db, kind: ImportKind, source: ImportSource, today = TODAY_ISO): Promise<CommitResult> {
  const table = parseCsv(source.text)
  const matches = matchColumns(table.headers, FIELDS[kind])
  const ctx = { today, existing: await loadExistingData(db) }
  const rows = acceptAllSuggestions(kind, buildRows(kind, table, matches), ctx)
  return commitImport(db, { kind, source, matches, rows, acceptedBy: "seed", today })
}

/** Students first: notes are checked against the students already in the database. */
export async function seedSampleData(db: Db, today = TODAY_ISO): Promise<Record<ImportKind, CommitResult>> {
  const students = await importAcceptingAll(db, "students", readSampleFile("students", "seed"), today)
  const notes = await importAcceptingAll(db, "notes", readSampleFile("notes", "seed"), today)
  return { students, notes }
}
