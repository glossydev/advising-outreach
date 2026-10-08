import { FIELDS, type FieldType, type ImportKind } from "../fields"
import { normalizeKey } from "../text"
import type { ExistingData, ExistingStudent, ImportRow, Issue, RuleName, Severity, Suggestion } from "../types"

export const activeRows = (rows: readonly ImportRow[]) => rows.filter((r) => !r.excluded)

export const valueOf = (row: ImportRow, key: string) => row.values[key] ?? ""

/** CSV line number: the header is line 1. */
export const lineOf = (row: ImportRow) => row.index + 2

export const fieldsOfType = (kind: ImportKind, ...types: FieldType[]) =>
  FIELDS[kind].filter((f) => types.includes(f.type))

export const quote = (s: string) => `"${s}"`

export function makeIssue(
  rule: RuleName,
  severity: Severity,
  row: ImportRow,
  field: string | undefined,
  message: string,
  extra: { value?: string; suggestions?: Suggestion[]; bulk?: boolean } = {},
): Issue {
  return {
    key: `${rule}:${row.index}:${field ?? "row"}`,
    rule,
    severity,
    rowIndex: row.index,
    field,
    message,
    value: extra.value,
    suggestions: extra.suggestions ?? [],
    bulk: extra.bulk,
  }
}

const looseIndexes = new WeakMap<ExistingData, Map<string, ExistingStudent>>()

/** Finds an existing student by ID, ignoring case and spacing. `exact` says whether the ID matched as typed. */
export function findStudent(existing: ExistingData, id: string): { student: ExistingStudent; exact: boolean } | null {
  const exact = existing.students.get(id)
  if (exact) return { student: exact, exact: true }
  let loose = looseIndexes.get(existing)
  if (!loose) {
    loose = new Map([...existing.students.values()].map((s) => [normalizeKey(s.student_id), s]))
    looseIndexes.set(existing, loose)
  }
  const student = loose.get(normalizeKey(id))
  return student ? { student, exact: false } : null
}

export const studentLabel = (s: Pick<ExistingStudent, "student_id" | "first_name" | "last_name">) =>
  `${s.student_id} ${s.first_name} ${s.last_name}`.trim()
