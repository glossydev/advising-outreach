import { buildRows, matchColumns } from "@/lib/import/columns"
import { parseCsv } from "@/lib/import/csv"
import { FIELDS, type ImportKind } from "@/lib/import/fields"
import type { ExistingData, ExistingNote, ExistingStudent, Issue, RuleName } from "@/lib/import/types"
import { validateRows } from "@/lib/import/validate"

export const TODAY = "2026-10-05"

export const STUDENT_HEADER =
  "student_id,first_name,last_name,email,major,class_year,credits_earned,gpa,advisor,last_contact_date,risk_flag"
export const NOTE_HEADER = "note_id,student_id,contact_date,contact_type,advisor,note_text"

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csvLine = (header: string, values: Record<string, string>) =>
  header
    .split(",")
    .map((k) => csvCell(values[k] ?? ""))
    .join(",")

/** A student row with nothing wrong with it; override any column by name. */
export function studentLine(overrides: Record<string, string> = {}): string {
  return csvLine(STUDENT_HEADER, {
    student_id: "S1",
    first_name: "Maya",
    last_name: "Patel",
    email: "maya.patel@example.edu",
    major: "Biology",
    class_year: "Sophomore",
    credits_earned: "48",
    gpa: "3.62",
    advisor: "Okafor",
    last_contact_date: "2026-09-18",
    risk_flag: "Low",
    ...overrides,
  })
}

/** A note row with nothing wrong with it (for student S1); override any column by name. */
export function noteLine(overrides: Record<string, string> = {}): string {
  return csvLine(NOTE_HEADER, {
    note_id: "N1",
    student_id: "S1",
    contact_date: "2026-09-18",
    contact_type: "In person",
    advisor: "Okafor",
    note_text: "Confirmed fall schedule.",
    ...overrides,
  })
}

export function existingStudent(overrides: Partial<ExistingStudent> = {}): ExistingStudent {
  return {
    student_id: "S1",
    first_name: "Maya",
    last_name: "Patel",
    email: "maya.patel@example.edu",
    major: "Biology",
    class_year: "Sophomore",
    credits_earned: 48,
    gpa: 3.62,
    advisor: "Okafor",
    risk_flag: "Low",
    source_last_contact_date: "2026-09-18",
    newest_note_date: null,
    ...overrides,
  }
}

export function existingData(students: ExistingStudent[] = [], notes: ExistingNote[] = []): ExistingData {
  return {
    students: new Map(students.map((s) => [s.student_id, s])),
    notes: new Map(notes.map((n) => [n.note_id, n])),
  }
}

/**
 * Scans inline CSV lines (header added) the way the importer does. Notes default to a database
 * that already holds student S1, so unknown_student stays quiet unless a test wants it.
 */
export function scan(kind: ImportKind, lines: string[], existing?: ExistingData) {
  const header = kind === "students" ? STUDENT_HEADER : NOTE_HEADER
  const table = parseCsv([header, ...lines].join("\n"))
  const matches = matchColumns(table.headers, FIELDS[kind])
  const rows = buildRows(kind, table, matches)
  const ctx = { today: TODAY, existing: existing ?? (kind === "notes" ? existingData([existingStudent()]) : existingData()) }
  return { table, matches, rows, ctx, issues: validateRows(kind, rows, ctx) }
}

export const ofRule = (issues: readonly Issue[], rule: RuleName) => issues.filter((i) => i.rule === rule)
