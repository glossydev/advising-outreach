import type { CsvTable } from "./csv"
import { DECISION_FIELDS, FIELDS, type FieldSpec, type ImportKind } from "./fields"
import { levenshtein, normalizeKey } from "./text"
import type { ImportRow } from "./types"

/*
 * Automatic column matching (DECISIONS P2). Each expected field is matched to one CSV column,
 * strongest evidence first. Anything other than an exact match is highlighted for a quick review.
 */

export type MatchKind = "exact" | "formatting" | "alias" | "guess" | "none"

export interface ColumnMatch {
  field: string
  header: string | null
  /** Position of the header in the CSV, or null when unmatched. */
  column: number | null
  kind: MatchKind
}

/** Below this similarity a header is not offered as a guess. */
const GUESS_THRESHOLD = 0.6

function similarity(a: string, b: string): number {
  const [x, y] = [normalizeKey(a), normalizeKey(b)]
  if (!x || !y) return 0
  if (x === y) return 1
  const shorter = x.length < y.length ? x : y
  if (shorter.length >= 4 && (x.includes(y) || y.includes(x))) return 0.8
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length)
}

export function matchColumns(headers: readonly string[], fields: readonly FieldSpec[]): ColumnMatch[] {
  const used = new Set<number>()
  const found = new Map<string, ColumnMatch>()
  const claim = (field: FieldSpec, column: number, kind: MatchKind) => {
    used.add(column)
    found.set(field.key, { field: field.key, header: headers[column], column, kind })
  }

  const tiers: [MatchKind, (field: FieldSpec, header: string) => boolean][] = [
    ["exact", (f, h) => h === f.key],
    ["formatting", (f, h) => normalizeKey(h) === normalizeKey(f.key)],
    ["alias", (f, h) => f.aliases.some((a) => normalizeKey(a) === normalizeKey(h))],
  ]
  for (const [kind, matches] of tiers) {
    for (const field of fields) {
      if (found.has(field.key)) continue
      const column = headers.findIndex((h, i) => !used.has(i) && matches(field, h))
      if (column >= 0) claim(field, column, kind)
    }
  }

  // Best remaining guesses, strongest first, so one field can't take a header another fits better.
  const candidates = fields
    .filter((f) => !found.has(f.key))
    .flatMap((f) =>
      headers.map((h, column) => ({
        field: f,
        column,
        score: Math.max(similarity(h, f.key), ...f.aliases.map((a) => similarity(h, a))),
      })),
    )
    .filter((c) => !used.has(c.column) && c.score >= GUESS_THRESHOLD)
    .sort((a, b) => b.score - a.score)
  for (const c of candidates) {
    if (!found.has(c.field.key) && !used.has(c.column)) claim(c.field, c.column, "guess")
  }

  return fields.map((f) => found.get(f.key) ?? { field: f.key, header: null, column: null, kind: "none" })
}

export function unusedHeaders(headers: readonly string[], matches: readonly ColumnMatch[]): string[] {
  const used = new Set(matches.map((m) => m.column))
  return headers.filter((_, i) => !used.has(i))
}

/** Required fields that no column was matched to. Import can't continue until these are assigned. */
export function missingRequired(kind: ImportKind, matches: readonly ColumnMatch[]): string[] {
  return FIELDS[kind]
    .filter((f) => f.required && (matches.find((m) => m.field === f.key)?.column ?? null) === null)
    .map((f) => f.key)
}

/** Builds editable rows from the CSV using the column matches. Values are copied exactly. */
export function buildRows(kind: ImportKind, table: CsvTable, matches: readonly ColumnMatch[]): ImportRow[] {
  return table.records.map((record, index) => {
    const values: Record<string, string> = {}
    for (const m of matches) values[m.field] = m.column === null ? "" : (record[m.column] ?? "")
    for (const key of DECISION_FIELDS[kind]) values[key] = ""
    return { index, values, excluded: false, acknowledged: [] }
  })
}
