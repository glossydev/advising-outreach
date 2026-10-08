/**
 * Phase 1 data audit (throwaway script).
 *
 * Reads the untouched files in data/source/ and writes docs/DATA_AUDIT.md.
 * It reports what it finds and decides nothing; decisions go in docs/DECISIONS.md.
 *
 *   npm run data:audit
 */
import { createHash } from "node:crypto"
import { readFileSync, statSync, writeFileSync } from "node:fs"
import { parse } from "csv-parse/sync"

const SOURCE_DIR = "data/source"
const OUTPUT = "docs/DATA_AUDIT.md"
/** "Today" per the brief. */
const REFERENCE_DATE = "2026-10-05"
const EXPECTED_STUDENTS = 50
/**
 * University of Arizona class standing by completed units: Sophomore 30, Junior 60, Senior 90.
 * https://archive.catalog.arizona.edu/policies/994/enrpol.htm
 */
const STANDING: [year: string, minUnits: number][] = [
  ["Freshman", 0],
  ["Sophomore", 30],
  ["Junior", 60],
  ["Senior", 90],
]
const KNOWN_CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"]
const KNOWN_RISK_FLAGS = ["low", "medium", "high"]
const MAX_PLAUSIBLE_UNITS = 200
const SHORT_NOTE_CHARS = 40
const SIMILAR_NOTE_JACCARD = 0.4
const EXAMPLE_LIMIT = 3

// ---------- loading ----------

interface Row {
  line: number
  v: Record<string, string>
}

interface Table {
  file: string
  raw: string
  header: string[]
  rows: Row[]
  widthMismatches: { line: number; width: number }[]
}

function loadCsv(file: string): Table {
  const raw = readFileSync(`${SOURCE_DIR}/${file}`, "utf8")
  const records = parse(raw, {
    info: true,
    relax_column_count: true,
    skip_empty_lines: true,
    bom: true,
  }) as unknown as { record: string[]; info: { lines: number } }[]
  const [head, ...body] = records
  const header = head.record
  return {
    file,
    raw,
    header,
    rows: body.map((r) => ({
      line: r.info.lines,
      v: Object.fromEntries(header.map((h, i) => [h, r.record[i] ?? ""])),
    })),
    widthMismatches: body
      .filter((r) => r.record.length !== header.length)
      .map((r) => ({ line: r.info.lines, width: r.record.length })),
  }
}

const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex")

// ---------- helpers ----------

const t = (s: string | undefined) => (s ?? "").trim()
const lower = (s: string | undefined) => t(s).toLowerCase()
const code = (s: string) => (s === "" ? "_(blank)_" : `\`${s}\``)
const fullName = (r: Row) => `${t(r.v.first_name)} ${t(r.v.last_name)}`
const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

/** "1 pair", "2 pairs", "1 student not in …". Only the first word of the unit is singularized. */
function quantity(count: number, unit: string) {
  if (count !== 1) return `${count} ${unit}`
  const [first, ...rest] = unit.split(" ")
  const singular = first.endsWith("sses") ? first.slice(0, -2) : first.endsWith("s") ? first.slice(0, -1) : first
  return [count, singular, ...rest].join(" ")
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    map.set(k, [...(map.get(k) ?? []), item])
  }
  return map
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

// ---------- dates ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const PLACEHOLDERS = new Set(["n/a", "na", "none", "null", "unknown", "tbd", "-", "--", "?"])

type OkDate = { kind: "ok"; iso: string; format: string; ambiguous: boolean }
type ParsedDate = { kind: "blank" } | { kind: "placeholder" } | { kind: "unparseable" } | OkDate

const monthNumber = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1

function calendar(y: number, mo: number, d: number, format: string, ambiguous = false): ParsedDate {
  const date = new Date(Date.UTC(y, mo - 1, d))
  const valid = mo >= 1 && date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
  return valid ? { kind: "ok", iso: date.toISOString().slice(0, 10), format, ambiguous } : { kind: "unparseable" }
}

function parseDate(raw: string): ParsedDate {
  const v = t(raw)
  if (!v) return { kind: "blank" }
  if (PLACEHOLDERS.has(v.toLowerCase())) return { kind: "placeholder" }
  let m: RegExpExecArray | null
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v))) return calendar(+m[1], +m[2], +m[3], "YYYY-MM-DD")
  if ((m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v))) return calendar(+m[1], +m[2], +m[3], "YYYY/MM/DD")
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)))
    return calendar(+m[3], +m[1], +m[2], "MM/DD/YYYY", +m[1] <= 12 && +m[2] <= 12 && m[1] !== m[2])
  if ((m = /^([A-Za-z]{3,9})\.? (\d{1,2}), (\d{4})$/.exec(v)))
    return calendar(+m[3], monthNumber(m[1]), +m[2], "Mon DD, YYYY")
  if ((m = /^(\d{1,2})-([A-Za-z]{3,9})-(\d{4})$/.exec(v)))
    return calendar(+m[3], monthNumber(m[2]), +m[1], "DD-Mon-YYYY")
  return { kind: "unparseable" }
}

const isoOf = (raw: string) => {
  const p = parseDate(raw)
  return p.kind === "ok" ? p.iso : null
}
const shape = (raw: string) => t(raw).replace(/\d/g, "9").replace(/[A-Za-z]/g, "a")
const daysBetween = (fromIso: string, toIso: string) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000)

// ---------- note text ----------

const PII_PATTERNS: [label: string, re: RegExp][] = [
  ["SSN-like number", /\b\d{3}-\d{2}-\d{4}\b/],
  ["Phone number", /(?:\(\d{3}\)\s?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/],
  ["Email address", /[\w.+-]+@[\w-]+\.[\w.-]+/],
]
const redact = (s: string) =>
  s
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN masked]")
    .replace(/(?:\(\d{3}\)\s?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/g, "[phone masked]")

const SENSITIVE_TERMS: [label: string, re: RegExp][] = [
  ["mental health", /\b(counsel(or|ing)|therap(y|ist)|anxiety|depress\w*|mental health|panic|suicid\w*|self-harm)\b/i],
  ["emotional distress", /\bemotional\b/i],
  ["medical", /\b(medical|diagnos\w*|illness|hospital\w*|disabilit\w*|accommodations?|pregnan\w*)\b/i],
  ["request for privacy", /\b(stay private|keep (this|it) private|confidential|don't share|do not share)\b/i],
  ["government ID", /\b(ssn|social security)\b/i],
]
const isSensitive = (s: string) => SENSITIVE_TERMS.some(([, re]) => re.test(s))

const PREFERENCE_RE =
  /\b((by|via) (phone|email|text)( only)?|(phone|email|text)[- ]only|prefers? (phone|email|text|calls?)|best reached|do not (email|call|text)|email goes to)\b/i
const WAITING_RE =
  /\b(no (reply|response)( yet)?|awaiting|pending|did not respond|has not responded|to reply|left (a )?voicemail)\b/i
const MONTH_WORD =
  "(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)"
const DATED_RE = new RegExp(
  `\\b(${MONTH_WORD}\\.? \\d{1,2}\\b|mid-${MONTH_WORD}\\b|deadline|this week|next week|scheduled)`,
  "i",
)

const STOPWORDS = new Set(
  "the and for with that this from about asked will has have was were are been her his him she they them their student not but into also".split(
    " ",
  ),
)
const tokens = (s: string) =>
  new Set(
    lower(s)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  )
function jaccard(a: Set<string>, b: Set<string>) {
  let shared = 0
  for (const x of a) if (b.has(x)) shared++
  return shared / (a.size + b.size - shared || 1)
}
/** Splits on . ! ? but not after titles like "Dr." */
const sentences = (s: string) =>
  t(s)
    .split(/(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|St)\.)(?<=[.!?])\s+/)
    .filter(Boolean)

// ---------- findings ----------

const SECTIONS = {
  files: "Files and columns",
  students: "students.csv",
  notes: "contact_notes.csv",
  cross: "Across both files",
  content: "What the note text contains",
} as const
type SectionKey = keyof typeof SECTIONS

interface Finding {
  section: SectionKey
  title: string
  count: number
  unit: string
  detail: string
  examples?: Record<string, string | number>[]
  exampleLimit?: number
  affected?: string[]
  options?: string[]
  /** Informational findings get no Decision line. */
  decision?: boolean
  /** Report even when count is 0. */
  always?: boolean
  /** Shown in the "found nothing" list when count is 0. */
  cleanNote?: string
}

const findings: Finding[] = []
const clean: { section: SectionKey; title: string; note?: string }[] = []

function add(f: Finding) {
  if (f.count > 0 || f.always) findings.push(f)
  else clean.push({ section: f.section, title: f.title, note: f.cleanNote })
}

// ---------- load ----------

const students = loadCsv("students.csv")
const notes = loadCsv("contact_notes.csv")
const S = students.rows
const N = notes.rows
const sid = (r: Row) => t(r.v.student_id).toUpperCase()
const nid = (r: Row) => t(r.v.note_id)
const studentById = new Map(S.map((r) => [sid(r), r]))
const noteDate = (r: Row) => isoOf(r.v.contact_date)

const notesByStudent = groupBy(N, sid)
for (const list of notesByStudent.values())
  list.sort((a, b) => (noteDate(a) ?? "").localeCompare(noteDate(b) ?? "") || nid(a).localeCompare(nid(b)))
const newestNote = (studentId: string) => notesByStudent.get(studentId)?.at(-1)

const SENSITIVE_TITLE = "Sensitive personal disclosures in note text"
const sensitiveNoteIds = new Set(N.filter((r) => isSensitive(r.v.note_text)).map(nid))
function snippet(r: Row, max = 90) {
  if (sensitiveNoteIds.has(nid(r))) return `_(withheld: see “${SENSITIVE_TITLE}”)_`
  return truncate(redact(t(r.v.note_text)), max)
}
const safeSentence = (s: string) => (isSensitive(s) ? "_(withheld: sensitive)_" : redact(s))
const who = (r: Row) => `${sid(r)} ${studentById.has(sid(r)) ? fullName(studentById.get(sid(r))!) : "(unknown)"}`
const riskOf = (r: Row) => t(studentById.get(sid(r))?.v.risk_flag)

// ---------- 1. files and columns ----------

const readmePath = `${SOURCE_DIR}/README.txt`
const readmeText = readFileSync(readmePath, "utf8")
const allColumns = [
  ...students.header.map((c) => `students.csv: ${c}`),
  ...notes.header.map((c) => `contact_notes.csv: ${c}`),
]
const undescribed = allColumns.filter((c) => !readmeText.includes(c.split(": ")[1]))
add({
  section: "files",
  title: "README.txt has no column descriptions",
  count: undescribed.length,
  unit: `of ${allColumns.length} columns undescribed`,
  detail: `README.txt is ${statSync(readmePath).size} bytes. The brief says it holds the column descriptions, so the meaning of every column has to be inferred from its header and its values (see the column profiles above). Columns the README might describe but the CSVs lack can't be checked either.`,
  affected: undescribed,
  options: [
    "Treat the CSV headers as the spec and write down the assumed meaning of each column in DECISIONS.md.",
    "Pause until the hiring team replies (Adam has asked), and adjust if a README arrives.",
  ],
})

for (const table of [students, notes]) {
  add({
    section: "files",
    title: `${table.file}: rows with the wrong number of columns`,
    count: table.widthMismatches.length,
    unit: "rows",
    detail: `The header has ${table.header.length} columns.`,
    examples: table.widthMismatches.map((m) => ({ line: m.line, columns: m.width })),
    cleanNote: `every row has ${table.header.length} columns`,
  })
  const lines = table.raw.split(/\r?\n/)
  const blankLines = lines.slice(0, -1).filter((l) => l.trim() === "").length
  add({
    section: "files",
    title: `${table.file}: blank lines`,
    count: blankLines,
    unit: "lines",
    detail: "Blank lines are skipped by the parser.",
    cleanNote: "none",
  })
  const nonAscii = [...table.raw.matchAll(/[^\x00-\x7F]/g)]
  add({
    section: "files",
    title: `${table.file}: non-ASCII characters`,
    count: nonAscii.length,
    unit: "characters",
    detail: "Characters such as curly quotes, accents or non-breaking spaces can break matching and search.",
    examples: nonAscii.map((m) => ({
      char: `U+${m[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
      context: truncate(table.raw.slice(Math.max(0, m.index! - 20), m.index! + 20).replace(/\s+/g, " "), 50),
    })),
    cleanNote: "none",
  })
}

// ---------- 2. students.csv ----------

add({
  section: "students",
  title: `Row count differs from the expected ${EXPECTED_STUDENTS}`,
  count: Math.abs(S.length - EXPECTED_STUDENTS),
  unit: "rows",
  detail: `students.csv has ${S.length} data rows.`,
  cleanNote: `${S.length} rows`,
})

const malformedIds = S.filter((r) => !/^S\d{4}$/.test(t(r.v.student_id)))
add({
  section: "students",
  title: "student_id not in the S#### pattern",
  count: malformedIds.length,
  unit: "rows",
  detail: "Every other ID follows S followed by four digits.",
  examples: malformedIds.map((r) => ({ line: r.line, student_id: code(r.v.student_id) })),
  cleanNote: "all match",
})

const idNumbers = S.map(sid)
  .filter((id) => /^S\d{4}$/.test(id))
  .map((id) => Number(id.slice(1)))
const idGaps: string[] = []
for (let n = Math.min(...idNumbers); n <= Math.max(...idNumbers); n++) if (!idNumbers.includes(n)) idGaps.push(`S${n}`)
add({
  section: "students",
  title: "Gaps in the student_id sequence",
  count: idGaps.length,
  unit: "IDs missing",
  detail: "A gap is not necessarily a problem, but can mean a row was dropped from the export.",
  affected: idGaps,
  decision: false,
  cleanNote: `S${Math.min(...idNumbers)}–S${Math.max(...idNumbers)} with no gaps`,
})

const duplicateIds = [...groupBy(S, sid)].filter(([, rows]) => rows.length > 1)
add({
  section: "students",
  title: "Duplicate student_id",
  count: duplicateIds.length,
  unit: "IDs",
  detail: "The same ID on more than one row.",
  examples: duplicateIds.flatMap(([, rows]) =>
    rows.map((r) => ({ line: r.line, student_id: sid(r), name: fullName(r), last_contact_date: code(r.v.last_contact_date) })),
  ),
  exampleLimit: 6,
  cleanNote: "none",
})

const duplicateNames = [...groupBy(S, (r) => `${lower(r.v.first_name)} ${lower(r.v.last_name)}`)].filter(
  ([, rows]) => rows.length > 1,
)
add({
  section: "students",
  title: "Same name under different student_ids",
  count: duplicateNames.length,
  unit: "names",
  detail: "Exact first + last name match.",
  examples: duplicateNames.flatMap(([, rows]) => rows.map((r) => ({ student_id: sid(r), name: fullName(r), email: r.v.email }))),
  exampleLimit: 6,
  cleanNote: "none",
})

const similarPairs: [Row, Row][] = []
for (let i = 0; i < S.length; i++) {
  for (let j = i + 1; j < S.length; j++) {
    const [a, b] = [S[i], S[j]]
    if (lower(a.v.last_name) !== lower(b.v.last_name)) continue
    const [fa, fb] = [lower(a.v.first_name), lower(b.v.first_name)]
    if (fa === fb) continue // exact matches are reported above
    if (levenshtein(fa, fb) <= 2 || fa.startsWith(fb) || fb.startsWith(fa)) similarPairs.push([a, b])
  }
}
add({
  section: "students",
  title: "Possibly the same student under two IDs (similar names)",
  count: similarPairs.length,
  unit: "pairs",
  detail:
    "Same last name, first names within two letters of each other. Each pair is shown side by side with the other columns and the student's newest note so the overlap is visible.",
  examples: similarPairs.flatMap(([a, b]) =>
    [a, b].map((r) => {
      const newest = newestNote(sid(r))
      return {
        student_id: sid(r),
        name: fullName(r),
        email: t(r.v.email),
        major: t(r.v.major),
        class_year: t(r.v.class_year),
        credits: t(r.v.credits_earned),
        gpa: t(r.v.gpa),
        advisor: t(r.v.advisor),
        risk: t(r.v.risk_flag),
        "newest note": newest ? `${nid(newest)} (${t(newest.v.advisor)}, ${noteDate(newest)}): ${snippet(newest)}` : "—",
      }
    }),
  ),
  exampleLimit: 10,
  options: [
    "Keep both records and show a “possible duplicate of …” warning on each, so an advisor can resolve it.",
    "Merge into one record automatically (would mean picking one ID, one advisor and one email).",
    "No action.",
  ],
  cleanNote: "none",
})

const CATEGORY_COLUMNS = ["class_year", "risk_flag", "advisor", "major"]
const variantRows = CATEGORY_COLUMNS.flatMap((col) =>
  [...groupBy(S.filter((r) => t(r.v[col])), (r) => lower(r.v[col]).replace(/\s+/g, " "))]
    .map(([key, rows]) => ({ col, key, spellings: [...new Set(rows.map((r) => r.v[col]))], rows }))
    .filter((g) => g.spellings.length > 1),
)
add({
  section: "students",
  title: "Same category value spelled differently (case or spacing)",
  count: variantRows.length,
  unit: "values",
  detail: `Checked ${CATEGORY_COLUMNS.join(", ")}. Full value lists are in Appendix A.`,
  examples: variantRows.map((g) => ({ column: g.col, spellings: g.spellings.map(code).join(", "), rows: g.rows.length })),
  cleanNote: `${CATEGORY_COLUMNS.join(", ")} are each spelled one way`,
})

const unknownYears = S.filter((r) => !KNOWN_CLASS_YEARS.includes(t(r.v.class_year)))
add({
  section: "students",
  title: "class_year outside Freshman / Sophomore / Junior / Senior / Graduate",
  count: unknownYears.length,
  unit: "rows",
  detail: "",
  examples: unknownYears.map((r) => ({ student_id: sid(r), class_year: code(r.v.class_year) })),
  cleanNote: "all recognized",
})

const unknownRisk = S.filter((r) => !KNOWN_RISK_FLAGS.includes(lower(r.v.risk_flag)))
add({
  section: "students",
  title: "risk_flag outside Low / Medium / High",
  count: unknownRisk.length,
  unit: "rows",
  detail: "",
  examples: unknownRisk.map((r) => ({ student_id: sid(r), risk_flag: code(r.v.risk_flag) })),
  cleanNote: "all recognized (case-insensitive)",
})

for (const col of ["student_id", "first_name", "last_name", "major", "class_year", "advisor", "risk_flag"]) {
  const blanks = S.filter((r) => !t(r.v[col]))
  add({
    section: "students",
    title: `${col} blank`,
    count: blanks.length,
    unit: "rows",
    detail: "",
    examples: blanks.map((r) => ({ line: r.line, student_id: sid(r), name: fullName(r) })),
    cleanNote: "none",
  })
}

// gpa
const gpaMissing = S.filter((r) => !t(r.v.gpa))
const gpaNonNumeric = S.filter((r) => t(r.v.gpa) && !/^-?\d+(\.\d+)?$/.test(t(r.v.gpa)))
const gpaOutOfRange = S.filter((r) => /^-?\d+(\.\d+)?$/.test(t(r.v.gpa)) && (Number(r.v.gpa) < 0 || Number(r.v.gpa) > 4))
for (const [title, rows] of [
  ["gpa missing", gpaMissing],
  ["gpa not a number", gpaNonNumeric],
  ["gpa outside 0.0–4.0", gpaOutOfRange],
] as const) {
  add({
    section: "students",
    title,
    count: rows.length,
    unit: "rows",
    detail: "",
    examples: rows.map((r) => ({ student_id: sid(r), name: fullName(r), gpa: code(r.v.gpa) })),
    cleanNote: "none",
  })
}
const gpas = S.map((r) => Number(r.v.gpa)).filter(Number.isFinite)

const riskVsGpa = S.filter((r) => {
  const [risk, gpa] = [lower(r.v.risk_flag), Number(r.v.gpa)]
  return Number.isFinite(gpa) && ((risk === "low" && gpa < 2.5) || (risk === "high" && gpa >= 3.0))
})
add({
  section: "students",
  title: "risk_flag at odds with GPA (Low risk under 2.5, or High risk at 3.0+)",
  count: riskVsGpa.length,
  unit: "rows",
  detail:
    "Who sets risk_flag and on what basis is undocumented. A flag that contradicts GPA may be stale or based on something else (attendance, finances).",
  examples: riskVsGpa.map((r) => ({ student_id: sid(r), name: fullName(r), risk_flag: t(r.v.risk_flag), gpa: t(r.v.gpa) })),
  options: ["Use risk_flag as given and show GPA beside it.", "Flag the contradiction on the student's record."],
  cleanNote: "every High-risk student has GPA under 3.0 and every Low-risk student 2.5 or above",
})

// credits_earned
const creditsMissing = S.filter((r) => !t(r.v.credits_earned))
const creditsNonNumeric = S.filter((r) => t(r.v.credits_earned) && !/^-?\d+$/.test(t(r.v.credits_earned)))
const creditsNegative = S.filter((r) => /^-\d+$/.test(t(r.v.credits_earned)))
const standingRange = (year: string): [number, number] | null => {
  const i = STANDING.findIndex(([y]) => y === t(year))
  if (i < 0) return null
  return [STANDING[i][1], i + 1 < STANDING.length ? STANDING[i + 1][1] - 1 : MAX_PLAUSIBLE_UNITS]
}
const creditsImplausible = S.filter((r) => {
  const range = standingRange(r.v.class_year)
  const n = Number(t(r.v.credits_earned))
  return range && /^\d+$/.test(t(r.v.credits_earned)) && (n < range[0] || n > range[1])
})
for (const [title, rows] of [
  ["credits_earned missing", creditsMissing],
  ["credits_earned not a whole number", creditsNonNumeric],
  ["credits_earned negative", creditsNegative],
] as const) {
  add({
    section: "students",
    title,
    count: rows.length,
    unit: "rows",
    detail: "",
    examples: rows.map((r) => ({ student_id: sid(r), credits_earned: code(r.v.credits_earned) })),
    cleanNote: "none",
  })
}
add({
  section: "students",
  title: "credits_earned outside the range for the class year",
  count: creditsImplausible.length,
  unit: "rows",
  detail: `Ranges use UA class standing by completed units (Freshman 0–29, Sophomore 30–59, Junior 60–89, Senior 90+, capped at ${MAX_PLAUSIBLE_UNITS}).`,
  examples: creditsImplausible.map((r) => ({
    student_id: sid(r),
    class_year: t(r.v.class_year),
    credits_earned: t(r.v.credits_earned),
    expected: standingRange(r.v.class_year)!.join("–"),
  })),
  cleanNote: "every student's credits fall in the UA class-standing range for their class year",
})

// dates (shared by both files)
function auditDates(section: SectionKey, rows: Row[], col: string, idOf: (r: Row) => string, unit: string) {
  const parsed = rows.map((r) => ({ r, p: parseDate(r.v[col]) }))
  const ok = parsed.filter((x): x is { r: Row; p: OkDate } => x.p.kind === "ok")
  const nonBlank = parsed.filter((x) => x.p.kind !== "blank")
  const shapes = [...groupBy(nonBlank, (x) => shape(x.r.v[col]))].sort((a, b) => b[1].length - a[1].length)
  const nonIso = ok.filter((x) => x.p.format !== "YYYY-MM-DD")
  add({
    section,
    title: `${col}: mixed date formats`,
    count: shapes.length > 1 ? nonBlank.length - ok.filter((x) => x.p.format === "YYYY-MM-DD").length : 0,
    unit: `${unit} not in YYYY-MM-DD`,
    detail: `Each distinct shape of value in ${col} (digits shown as 9, letters as a), how it parses, and every row that uses it. ${nonIso.length} non-ISO values parse unambiguously to a real calendar date.`,
    examples: shapes.map(([s, xs]) => ({
      shape: code(s),
      "parses as": xs[0].p.kind === "ok" ? (xs[0].p as OkDate).format : xs[0].p.kind,
      count: xs.length,
      rows:
        xs.length > 6
          ? `e.g. ${xs
              .slice(0, 2)
              .map((x) => `${idOf(x.r)} ${code(t(x.r.v[col]))}`)
              .join(", ")}`
          : xs.map((x) => `${idOf(x.r)} ${code(t(x.r.v[col]))}`).join(", "),
    })),
    exampleLimit: Infinity,
    options: [
      "Normalize every recognized format to YYYY-MM-DD at import and log each conversion as an info-level issue.",
      "Reject rows whose dates are not ISO.",
    ],
    cleanNote: "all YYYY-MM-DD",
  })
  const placeholders = parsed.filter((x) => x.p.kind === "placeholder")
  add({
    section,
    title: `${col}: placeholder text instead of a date`,
    count: placeholders.length,
    unit,
    detail: `Values such as N/A or TBD.`,
    examples: placeholders.map((x) => ({ id: idOf(x.r), value: code(x.r.v[col]) })),
    options: [
      "Treat as blank (no date on record) and log it.",
      "Keep a separate “unknown” state distinct from blank.",
    ],
    cleanNote: "none",
  })
  const blanks = parsed.filter((x) => x.p.kind === "blank")
  add({
    section,
    title: `${col}: blank`,
    count: blanks.length,
    unit,
    detail: "",
    examples: blanks.map((x) => ({ id: idOf(x.r), line: x.r.line })),
    options: [
      "Treat as no recorded contact; if the student has notes, use the newest note's date instead.",
      "Treat as never contacted.",
    ],
    cleanNote: "none",
  })
  const unparseable = parsed.filter((x) => x.p.kind === "unparseable")
  add({
    section,
    title: `${col}: not readable as a date`,
    count: unparseable.length,
    unit,
    detail: "Not blank, not a placeholder, and not any recognized format (or not a real calendar date).",
    examples: unparseable.map((x) => ({ id: idOf(x.r), value: code(x.r.v[col]) })),
    cleanNote: "every non-blank, non-placeholder value parses to a real calendar date",
  })
  const future = ok.filter((x) => x.p.iso > REFERENCE_DATE)
  add({
    section,
    title: `${col}: after ${REFERENCE_DATE}`,
    count: future.length,
    unit,
    detail: "Dates after the reference “today”.",
    examples: future.map((x) => ({ id: idOf(x.r), value: code(x.r.v[col]), iso: x.p.iso })),
    cleanNote: `latest is ${ok.map((x) => x.p.iso).sort().at(-1)}`,
  })
  const ambiguous = ok.filter((x) => x.p.ambiguous)
  const monthFirst = ok.filter((x) => x.p.format === "MM/DD/YYYY")
  add({
    section,
    title: `${col}: slash dates that could be read as MM/DD or DD/MM`,
    count: ambiguous.length,
    unit,
    detail: "",
    examples: ambiguous.map((x) => ({ id: idOf(x.r), value: code(x.r.v[col]), "read as (MM/DD)": x.p.iso })),
    cleanNote: monthFirst.length
      ? `${monthFirst.map((x) => `${idOf(x.r)} ${code(t(x.r.v[col]))}`).join(", ")} has a day above 12, so it can only be month-first`
      : "no month-first slash dates",
  })
  return parsed
}

auditDates("students", S, "last_contact_date", (r) => sid(r), "students")

// email
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
const emailMissing = S.filter((r) => !t(r.v.email))
const emailMalformed = S.filter((r) => t(r.v.email) && !EMAIL_RE.test(t(r.v.email)))
const emailDuplicates = [...groupBy(S.filter((r) => t(r.v.email)), (r) => lower(r.v.email))].filter(([, rows]) => rows.length > 1)
const emailNameMismatch = S.filter(
  (r) =>
    EMAIL_RE.test(t(r.v.email)) && letters(t(r.v.email).split("@")[0]) !== letters(r.v.first_name) + letters(r.v.last_name),
)
add({ section: "students", title: "email missing", count: emailMissing.length, unit: "rows", detail: "", examples: emailMissing.map((r) => ({ student_id: sid(r), name: fullName(r) })), cleanNote: "none" })
add({ section: "students", title: "email malformed", count: emailMalformed.length, unit: "rows", detail: "", examples: emailMalformed.map((r) => ({ student_id: sid(r), email: code(r.v.email) })), cleanNote: "none" })
add({
  section: "students",
  title: "email shared by more than one student",
  count: emailDuplicates.length,
  unit: "addresses",
  detail: "",
  examples: emailDuplicates.flatMap(([email, rows]) => rows.map((r) => ({ email, student_id: sid(r), name: fullName(r) }))),
  cleanNote: "none",
})
add({
  section: "students",
  title: "email address doesn't match the student's name",
  count: emailNameMismatch.length,
  unit: "rows",
  detail: "Every other address is first.last@ the domain (punctuation ignored).",
  examples: emailNameMismatch.map((r) => ({ student_id: sid(r), name: fullName(r), email: code(r.v.email) })),
  cleanNote: "every address is first.last@example.edu",
})

// whitespace (both files)
function whitespaceCells(table: Table) {
  return table.rows.flatMap((r) =>
    table.header
      .filter((h) => r.v[h] !== t(r.v[h]) || /\s{2,}|\t| /.test(r.v[h]))
      .map((h) => ({ line: r.line, column: h, value: code(r.v[h].replace(/ /g, "·")) })),
  )
}
const studentWhitespace = whitespaceCells(students)
add({
  section: "students",
  title: "Leading, trailing or doubled whitespace in a cell",
  count: studentWhitespace.length,
  unit: "cells",
  detail: "Spaces shown as ·.",
  examples: studentWhitespace,
  cleanNote: "none",
})

// ---------- 3. contact_notes.csv ----------

const noteIdsMissing = N.filter((r) => !nid(r))
const noteIdDuplicates = [...groupBy(N.filter(nid), nid)].filter(([, rows]) => rows.length > 1)
const noteIdMalformed = N.filter((r) => nid(r) && !/^N\d{3,}$/.test(nid(r)))
add({ section: "notes", title: "note_id blank", count: noteIdsMissing.length, unit: "rows", detail: "", examples: noteIdsMissing.map((r) => ({ line: r.line })), cleanNote: "none" })
add({
  section: "notes",
  title: "Duplicate note_id",
  count: noteIdDuplicates.length,
  unit: "IDs",
  detail: "",
  examples: noteIdDuplicates.flatMap(([, rows]) => rows.map((r) => ({ line: r.line, note_id: nid(r), student: who(r) }))),
  cleanNote: "none",
})
add({ section: "notes", title: "note_id not in the N### pattern", count: noteIdMalformed.length, unit: "rows", detail: "", examples: noteIdMalformed.map((r) => ({ line: r.line, note_id: code(r.v.note_id) })), cleanNote: "all match" })
const noteNumbers = N.map(nid)
  .filter((id) => /^N\d+$/.test(id))
  .map((id) => Number(id.slice(1)))
const noteGaps: string[] = []
for (let n = Math.min(...noteNumbers); n <= Math.max(...noteNumbers); n++)
  if (!noteNumbers.includes(n)) noteGaps.push(`N${String(n).padStart(3, "0")}`)
add({
  section: "notes",
  title: "Gaps in the note_id sequence",
  count: noteGaps.length,
  unit: "IDs missing",
  detail: "",
  affected: noteGaps,
  decision: false,
  cleanNote: `N${String(Math.min(...noteNumbers)).padStart(3, "0")}–N${String(Math.max(...noteNumbers)).padStart(3, "0")} with no gaps`,
})
const noteDateOrder = N.filter((r, i) => i > 0 && (noteDate(r) ?? "") < (noteDate(N[i - 1]) ?? ""))
add({
  section: "notes",
  title: "Notes out of date order relative to note_id",
  count: noteDateOrder.length,
  unit: "rows",
  detail: "A note dated earlier than the note before it in the file. IDs appear to be assigned in date order otherwise.",
  examples: noteDateOrder.map((r) => ({ note_id: nid(r), contact_date: code(r.v.contact_date) })),
  decision: false,
  cleanNote: "IDs increase with contact_date",
})

const fullDuplicates = [...groupBy(N, (r) => notes.header.map((h) => t(r.v[h])).join("\u0001"))].filter(([, rows]) => rows.length > 1)
add({ section: "notes", title: "Fully duplicated rows", count: fullDuplicates.length, unit: "groups", detail: "", examples: fullDuplicates.flatMap(([, rows]) => rows.map((r) => ({ line: r.line, note_id: nid(r) }))), cleanNote: "none" })
const contentDuplicates = [
  ...groupBy(N, (r) => [sid(r), noteDate(r) ?? t(r.v.contact_date), lower(r.v.contact_type), lower(r.v.note_text)].join("\u0001")),
].filter(([, rows]) => rows.length > 1)
add({
  section: "notes",
  title: "Same note logged twice under different note_ids",
  count: contentDuplicates.length,
  unit: "groups",
  detail: "Same student, date, contact type and text.",
  examples: contentDuplicates.flatMap(([, rows]) => rows.map((r) => ({ note_id: nid(r), student: who(r), date: code(r.v.contact_date) }))),
  cleanNote: "none",
})

const orphans = N.filter((r) => !studentById.has(sid(r)))
add({
  section: "notes",
  title: "Notes for a student_id that isn't in students.csv",
  count: orphans.length,
  unit: "notes",
  detail: "",
  examples: orphans.map((r) => ({ note_id: nid(r), student_id: code(r.v.student_id), text: snippet(r) })),
  options: ["Drop the note and log an error-level issue.", "Keep it attached to a placeholder student."],
  cleanNote: "every note's student_id exists",
})

for (const col of ["student_id", "contact_type", "advisor"]) {
  const blanks = N.filter((r) => !t(r.v[col]))
  add({ section: "notes", title: `${col} blank`, count: blanks.length, unit: "rows", detail: "", examples: blanks.map((r) => ({ note_id: nid(r) })), cleanNote: "none" })
}

auditDates("notes", N, "contact_date", (r) => nid(r), "notes")

const noteVariants = ["contact_type", "advisor"].flatMap((col) =>
  [...groupBy(N.filter((r) => t(r.v[col])), (r) => lower(r.v[col]).replace(/\s+/g, " "))]
    .map(([key, rows]) => ({ col, key, spellings: [...new Set(rows.map((r) => r.v[col]))], rows }))
    .filter((g) => g.spellings.length > 1),
)
add({
  section: "notes",
  title: "Same category value spelled differently (case or spacing)",
  count: noteVariants.length,
  unit: "values",
  detail: "Checked contact_type and advisor. Full value lists are in Appendix A.",
  examples: noteVariants.map((g) => ({ column: g.col, spellings: g.spellings.map(code).join(", "), rows: g.rows.length })),
  cleanNote: "contact_type and advisor are each spelled one way",
})

const emptyText = N.filter((r) => !t(r.v.note_text))
add({ section: "notes", title: "note_text empty or whitespace only", count: emptyText.length, unit: "notes", detail: "", examples: emptyText.map((r) => ({ note_id: nid(r), student: who(r) })), cleanNote: "none" })
const shortText = N.filter((r) => t(r.v.note_text) && t(r.v.note_text).length < SHORT_NOTE_CHARS).sort(
  (a, b) => t(a.v.note_text).length - t(b.v.note_text).length,
)
add({
  section: "notes",
  title: `note_text shorter than ${SHORT_NOTE_CHARS} characters`,
  count: shortText.length,
  unit: "notes",
  detail: "Short isn't necessarily bad. These are the shortest notes, so you can judge whether they carry enough for the next advisor.",
  examples: shortText.map((r) => ({ note_id: nid(r), student: who(r), chars: t(r.v.note_text).length, text: snippet(r) })),
  exampleLimit: Infinity,
  options: ["No action; keep them as written.", "Flag notes under a minimum length when an advisor logs a new one."],
  cleanNote: "none",
})
const repeatedText = N.filter((r) => {
  const text = t(r.v.note_text)
  const ss = sentences(text).map((s) => s.toLowerCase())
  const half = text.length / 2
  return new Set(ss).size !== ss.length || (text.length > 20 && Number.isInteger(half) && text.slice(0, half).trim() === text.slice(half).trim())
})
add({
  section: "notes",
  title: "Note text that looks pasted twice (repeated sentence)",
  count: repeatedText.length,
  unit: "notes",
  detail: "",
  examples: repeatedText.map((r) => ({ note_id: nid(r), student: who(r), text: snippet(r, 140) })),
  cleanNote: "no note repeats a sentence or itself",
})

const similarNotes: { a: Row; b: Row; score: number }[] = []
for (let i = 0; i < N.length; i++) {
  for (let j = i + 1; j < N.length; j++) {
    const score = jaccard(tokens(N[i].v.note_text), tokens(N[j].v.note_text))
    if (score >= SIMILAR_NOTE_JACCARD) similarNotes.push({ a: N[i], b: N[j], score })
  }
}
add({
  section: "notes",
  title: "Near-identical text in two different notes",
  count: similarNotes.length,
  unit: "pairs",
  detail: `Word overlap (Jaccard, ignoring common words) of ${SIMILAR_NOTE_JACCARD} or more between two notes. Could mean a note was copied to the wrong record, or the same situation was written up twice.`,
  examples: similarNotes.flatMap(({ a, b, score }) => [
    { pair: `${nid(a)} ↔ ${nid(b)} (${score.toFixed(2)})`, note_id: nid(a), student: who(a), advisor: t(a.v.advisor), date: noteDate(a) ?? "", text: snippet(a, 120) },
    { pair: "", note_id: nid(b), student: who(b), advisor: t(b.v.advisor), date: noteDate(b) ?? "", text: snippet(b, 120) },
  ]),
  exampleLimit: 10,
  options: [
    "Treat as evidence for the possible-duplicate-student finding if the students overlap.",
    "No action.",
  ],
  cleanNote: "none",
})

const advisorMismatch = N.filter((r) => studentById.has(sid(r)) && lower(r.v.advisor) !== lower(studentById.get(sid(r))!.v.advisor))
add({
  section: "notes",
  title: "Note written by a different advisor than the student's assigned advisor",
  count: advisorMismatch.length,
  unit: `of ${N.length} notes`,
  detail: "",
  examples: advisorMismatch.map((r) => ({ note_id: nid(r), student: who(r), "note advisor": t(r.v.advisor), "assigned advisor": t(studentById.get(sid(r))!.v.advisor) })),
  options: ["Show the note's author as written; the assigned advisor stays as in students.csv.", "Treat as a reassignment."],
  cleanNote: `every note's advisor matches the student's assigned advisor`,
})

const noteWhitespace = whitespaceCells(notes)
add({ section: "notes", title: "Leading, trailing or doubled whitespace in a cell", count: noteWhitespace.length, unit: "cells", detail: "Spaces shown as ·.", examples: noteWhitespace, cleanNote: "none" })

// ---------- 4. across both files ----------

const noNotes = S.filter((r) => !notesByStudent.has(sid(r)))
add({
  section: "cross",
  title: "Students with no contact notes",
  count: noNotes.length,
  unit: "students",
  detail: "",
  examples: noNotes.map((r) => ({
    student_id: sid(r),
    name: fullName(r),
    class_year: t(r.v.class_year),
    risk_flag: t(r.v.risk_flag),
    gpa: t(r.v.gpa),
    last_contact_date: code(r.v.last_contact_date),
  })),
  exampleLimit: Infinity,
  options: [
    "Show as “no contact on record” and rank at the top of the outreach queue.",
    "Show as “never contacted” (stronger claim: the spreadsheet may simply be missing the history).",
  ],
  cleanNote: "every student has at least one note",
})

type Agreement = "agree" | "disagree" | "column only (no notes)" | "notes only (column blank or unreadable)" | "neither"
const comparison = S.map((r) => {
  const column = isoOf(r.v.last_contact_date)
  const newest = newestNote(sid(r))
  const noteIso = newest ? noteDate(newest) : null
  const kind: Agreement =
    column && noteIso
      ? column === noteIso
        ? "agree"
        : "disagree"
      : column
        ? "column only (no notes)"
        : noteIso
          ? "notes only (column blank or unreadable)"
          : "neither"
  return { r, column, newest, noteIso, kind }
})
const breakdown = [...groupBy(comparison, (c) => c.kind)].map(([kind, cs]) => `| ${kind} | ${cs.length} |`).join("\n")
const sameDateDifferentText = comparison.filter((c) => c.kind === "agree" && t(c.r.v.last_contact_date) !== t(c.newest!.v.contact_date))
const notAgreeing = comparison.filter((c) => c.kind !== "agree" && c.kind !== "neither")
add({
  section: "cross",
  title: "last_contact_date compared with each student's newest note",
  count: S.length,
  unit: "students compared",
  always: true,
  detail: [
    "Both sides normalized to YYYY-MM-DD before comparing.",
    "",
    "| result | students |",
    "| --- | --- |",
    breakdown,
    "",
    `${sameDateDifferentText.length} of the agreeing students have the same date written differently in the two files (for example ${sameDateDifferentText
      .slice(0, 2)
      .map((c) => `${sid(c.r)}: ${code(t(c.r.v.last_contact_date))} vs ${nid(c.newest!)} ${code(t(c.newest!.v.contact_date))}`)
      .join("; ")}), so a plain text comparison would report them as disagreements.`,
    "",
    notAgreeing.length === 0
      ? "No student's last_contact_date disagrees with their notes. The examples below are agreeing rows."
      : "The examples below are every student where the two sources don't agree.",
  ].join("\n"),
  examples: (notAgreeing.length ? notAgreeing : comparison.slice(0, EXAMPLE_LIMIT)).map((c) => ({
    student_id: sid(c.r),
    name: fullName(c.r),
    last_contact_date: code(c.r.v.last_contact_date),
    "newest note": c.newest ? `${nid(c.newest)} ${c.noteIso}` : "—",
    result: c.kind,
  })),
  exampleLimit: Infinity,
  options: [
    "Derive last contact from the newest note, keep the CSV value alongside it as source_last_contact_date, and log any disagreement.",
    "Trust the CSV column as the record of last contact.",
    "Use whichever of the two is more recent.",
  ],
})

// ---------- 5. note content ----------

const piiHits = N.flatMap((r) =>
  PII_PATTERNS.filter(([, re]) => re.test(r.v.note_text)).map(([label, re]) => ({
    note_id: nid(r),
    student: who(r),
    date: noteDate(r) ?? "",
    found: label,
    context: redact(sentences(r.v.note_text).find((s) => re.test(s)) ?? ""),
  })),
)
add({
  section: "content",
  title: "Personal identifiers written into note text",
  count: new Set(piiHits.map((h) => h.note_id)).size,
  unit: "notes",
  detail:
    "Pattern search for SSN-like numbers (###-##-####), phone numbers and email addresses inside note_text. Numbers are masked in this report.",
  examples: piiHits,
  exampleLimit: Infinity,
  options: [
    "Mask SSN-like numbers at import, store only the masked text, and log an issue naming the note.",
    "Also mask or block SSN-like numbers when an advisor logs a new note.",
    "Keep the original text and hide it in the UI (the number would still be stored).",
  ],
  cleanNote: "none",
})

const sensitiveHits = N.filter((r) => sensitiveNoteIds.has(nid(r))).map((r) => ({
  note_id: nid(r),
  student: who(r),
  advisor: t(r.v.advisor),
  date: noteDate(r) ?? "",
  "matched terms": SENSITIVE_TERMS.flatMap(([label, re]) => {
    const m = re.exec(r.v.note_text)
    return m ? [`${label} (“${m[0]}”)`] : []
  }).join("; "),
}))
add({
  section: "content",
  title: SENSITIVE_TITLE,
  count: sensitiveHits.length,
  unit: "notes",
  detail:
    "Keyword search for health, mental-health, privacy-request and government-ID terms. Only the matched words are shown here, not the note text.",
  examples: sensitiveHits,
  exampleLimit: Infinity,
  options: [
    "Mark the note sensitive: collapsed in the timeline with a reason, and left out of any summary or AI feature.",
    "Show it like any other note.",
    "Remove the sensitive sentences at import.",
  ],
  cleanNote: "none",
})

const preferenceRows = N.filter((r) => PREFERENCE_RE.test(r.v.note_text)).map((r) => {
  const stated = sentences(r.v.note_text).find((s) => PREFERENCE_RE.test(s)) ?? ""
  const channel = /phone|call/i.test(stated) ? "Phone" : /email/i.test(stated) ? "Email" : /text/i.test(stated) ? "Text" : "?"
  const later = (notesByStudent.get(sid(r)) ?? []).filter((n) => (noteDate(n) ?? "") > (noteDate(r) ?? ""))
  const conflicts = later.filter((n) => ["phone", "email", "text"].includes(lower(n.v.contact_type)) && lower(n.v.contact_type) !== channel.toLowerCase())
  return { r, stated, channel, later, conflicts }
})
add({
  section: "content",
  title: "Contact preferences stated only in note text",
  count: preferenceRows.length,
  unit: "notes",
  detail:
    "A preference written in a note is easy to miss on the next contact. For each one, the student's later contacts are listed and any that used a different channel are marked.",
  examples: preferenceRows.map((p) => ({
    note_id: nid(p.r),
    student: who(p.r),
    stated: safeSentence(p.stated),
    "later contacts": p.later.length
      ? p.later
          .map((n) => `${nid(n)} ${noteDate(n)} ${t(n.v.contact_type)}${p.conflicts.includes(n) ? " ⚠ conflicts" : ""}`)
          .join("; ")
      : "none",
  })),
  exampleLimit: Infinity,
  options: [
    "Show stated contact preferences on the student's detail page and warn when an advisor logs contact through a conflicting channel.",
    "Leave them in the note text.",
  ],
  cleanNote: "none",
})

const waitingRows = N.filter((r) => WAITING_RE.test(r.v.note_text)).map((r) => {
  const newest = newestNote(sid(r))
  return {
    note_id: nid(r),
    student: who(r),
    risk: riskOf(r),
    date: noteDate(r) ?? "",
    "days before today": noteDate(r) ? daysBetween(noteDate(r)!, REFERENCE_DATE) : "",
    "student's newest note?": newest && nid(newest) === nid(r) ? "yes" : `no (newest: ${newest ? nid(newest) : "—"})`,
    says: safeSentence(sentences(r.v.note_text).find((s) => WAITING_RE.test(s)) ?? ""),
  }
})
add({
  section: "content",
  title: "Notes left waiting on something (no reply, pending, awaiting)",
  count: waitingRows.length,
  unit: "notes",
  detail:
    "An open item in the student's newest note means nothing has been logged since. An open item in an older note may have been resolved later. This is a keyword search, so it can miss open items phrased other ways.",
  examples: waitingRows,
  exampleLimit: Infinity,
  options: [
    "Raise a student's outreach priority when their newest note is still waiting on a reply.",
    "Surface these on the detail page only.",
    "No action.",
  ],
  cleanNote: "none",
})

const datedRows = N.filter((r) => DATED_RE.test(r.v.note_text)).map((r) => {
  const newest = newestNote(sid(r))
  return {
    note_id: nid(r),
    student: who(r),
    risk: riskOf(r),
    date: noteDate(r) ?? "",
    "student's newest note?": newest && nid(newest) === nid(r) ? "yes" : `no (newest: ${newest ? nid(newest) : "—"})`,
    phrase: DATED_RE.exec(r.v.note_text)![0],
    says: safeSentence(sentences(r.v.note_text).find((s) => DATED_RE.test(s)) ?? ""),
  }
})
add({
  section: "content",
  title: "Deadlines and follow-up dates written into note text",
  count: datedRows.length,
  unit: "notes",
  detail:
    "contact_notes.csv has no follow-up date column (the v0 app expects one). These notes mention a date, deadline or scheduled event in the text.",
  examples: datedRows,
  exampleLimit: Infinity,
  options: [
    "Extract explicit dates (e.g. “by Oct 15” → 2026-10-15) into a follow-up date at import, and log each extraction.",
    "Leave them in the text; follow-up dates only apply to notes logged in the app.",
  ],
  cleanNote: "none",
})

// ---------- decisions (agreed 2026-10-08, see docs/DECISIONS.md) ----------

/** Finding title → the decision that handles it, so regenerating this report keeps the links. */
const DECISION_REFS: Record<string, string> = {
  "README.txt has no column descriptions":
    "no rule. The CSV headers are the spec; assumed column meanings are in [IMPORT_DESIGN.md](IMPORT_DESIGN.md#assumed-column-meanings).",
  "Possibly the same student under two IDs (similar names)": "D15 `possible_duplicate_student`",
  "last_contact_date: mixed date formats": "D4 `date_not_iso`",
  "last_contact_date: placeholder text instead of a date": "D5 `date_placeholder`",
  "last_contact_date: blank": "allowed (optional column). Students with neither a date nor notes are handled by D24 `no_contact_on_record`.",
  "contact_date: mixed date formats": "D4 `date_not_iso`",
  "note_text shorter than 40 characters": "no rule; no action.",
  "Near-identical text in two different notes": "no rule. N026/N036 is evidence for D15; N044/N048 is a false positive.",
  "Students with no contact notes": "D24 `no_contact_on_record`",
  "last_contact_date compared with each student's newest note": "D22 `last_contact_mismatch`",
  "Personal identifiers written into note text": "D17 `ssn_in_text`",
  [SENSITIVE_TITLE]: "D18 `sensitive_content`",
  "Contact preferences stated only in note text": "D19 `contact_preference_in_text`",
  "Notes left waiting on something (no reply, pending, awaiting)": "D25 `waiting_on_student`",
  "Deadlines and follow-up dates written into note text": "D20 `follow_up_date_in_text`",
}
const decisionFor = (f: Finding) => DECISION_REFS[f.title] ?? "_(none recorded yet)_"
const shortDecision = (f: Finding) => (decisionFor(f).match(/^D\d+ `[^`]+`/)?.[0] ?? decisionFor(f).split(/[.;]/)[0])

// ---------- render ----------

const out: string[] = []
const push = (...lines: string[]) => out.push(...lines)

function table(rows: Record<string, string | number>[]) {
  if (!rows.length) return []
  const cols = Object.keys(rows[0])
  const cell = (v: string | number | undefined) => String(v ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
  return [`| ${cols.join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${cols.map((c) => cell(r[c])).join(" | ")} |`)]
}

const sectionKeys = Object.keys(SECTIONS) as SectionKey[]
const numbered = sectionKeys.flatMap((key, si) =>
  findings.filter((f) => f.section === key).map((f, fi) => ({ ...f, num: `${si + 1}.${fi + 1}` })),
)
const anchor = (num: string, title: string) =>
  `${num} ${title}`
    .toLowerCase()
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/ /g, "-")

push(
  "# Data audit",
  "",
  `Generated by \`scripts/audit.ts\` on ${new Date().toLocaleDateString("en-CA")} from the untouched files in \`data/source/\`. Reference date (“today”): **${REFERENCE_DATE}**.`,
  "",
  "This report says what is in the data. The decisions were made afterwards, with Adam, and are recorded as numbered entries in [DECISIONS.md](DECISIONS.md); each finding below links to the one that handles it.",
  "",
  "Personal data in this report: SSN-like and phone-like numbers are masked, and notes with sensitive content are described by matched keyword, not quoted.",
  "",
  "## Summary",
  "",
  "| # | Finding | Count | Decision |",
  "| --- | --- | --- | --- |",
  ...numbered.map(
    (f) =>
      `| ${f.num} | [${f.title.replace(/\|/g, "\\|")}](#${anchor(f.num, f.title)}) | ${quantity(f.count, f.unit)} | ${f.decision === false ? "—" : shortDecision(f)} |`,
  ),
  "",
  `Also checked and found nothing: ${clean.length} checks, listed in [Appendix B](#appendix-b-checks-that-found-nothing).`,
  "",
)

sectionKeys.forEach((key, si) => {
  push(`## ${si + 1}. ${SECTIONS[key]}`, "")
  if (key === "files") {
    push("### File facts", "")
    push(
      ...table(
        [students, notes].map((tb) => ({
          file: tb.file,
          bytes: Buffer.byteLength(tb.raw),
          "data rows": tb.rows.length,
          columns: tb.header.length,
          "line endings": tb.raw.includes("\r\n") ? (/[^\r]\n/.test(tb.raw) ? "mixed" : "CRLF") : "LF",
          BOM: tb.raw.charCodeAt(0) === 0xfeff ? "yes" : "no",
          "SHA-256": `\`${sha256(`${SOURCE_DIR}/${tb.file}`)}\``,
        })),
      ),
      "",
      `README.txt: ${statSync(readmePath).size} bytes, SHA-256 \`${sha256(readmePath)}\`.`,
      "",
      "### Column profiles",
      "",
      "With no README, this is the only description of the columns: what each one holds, as found.",
      "",
    )
    push(
      ...table(
        [students, notes].flatMap((tb) =>
          tb.header.map((h) => {
            const values = tb.rows.map((r) => r.v[h])
            const filled = values.filter((v) => t(v))
            const distinct = [...new Set(filled.map(t))]
            const kind = filled.every((v) => /^-?\d+$/.test(t(v)))
              ? "integer"
              : filled.every((v) => /^-?\d+(\.\d+)?$/.test(t(v)))
                ? "decimal"
                : filled.every((v) => parseDate(v).kind === "ok" || parseDate(v).kind === "placeholder")
                  ? "date"
                  : "text"
            const lengths = filled.map((v) => t(v).length)
            const sample =
              h === "note_text"
                ? `${Math.min(...lengths)}–${Math.max(...lengths)} characters`
                : distinct.length <= 6
                  ? distinct.map(code).join(", ")
                  : `${distinct.slice(0, 3).map(code).join(", ")}, …`
            return {
              file: tb.file,
              column: h,
              filled: `${filled.length}/${values.length}`,
              distinct: distinct.length,
              looks_like: kind,
              values: sample,
            }
          }),
        ),
      ),
      "",
      `GPA ranges from ${Math.min(...gpas).toFixed(2)} to ${Math.max(...gpas).toFixed(2)}.`,
      "",
    )
  }
  for (const f of numbered.filter((x) => x.section === key)) {
    push(`### ${f.num} ${f.title}`, "", `**Count:** ${quantity(f.count, f.unit)}`, "")
    if (f.detail) push(f.detail, "")
    if (f.examples?.length) {
      const limit = f.exampleLimit ?? EXAMPLE_LIMIT
      push(...table(f.examples.slice(0, limit)))
      if (f.examples.length > limit) push("", `_…and ${f.examples.length - limit} more._`)
      push("")
    }
    if (f.affected?.length) push(`**Affected:** ${f.affected.join(", ")}`, "")
    if (f.options?.length) push("**Options:**", "", ...f.options.map((o) => `- ${o}`), "")
    if (f.decision !== false) push(`**Decision:** ${decisionFor(f)}`, "")
  }
})

push("## Appendix A: Value inventories", "")
for (const [file, rows, cols] of [
  ["students.csv", S, CATEGORY_COLUMNS],
  ["contact_notes.csv", N, ["contact_type", "advisor"]],
] as const) {
  for (const col of cols) {
    const counts = [...groupBy(rows, (r) => r.v[col])].map(([v, rs]) => ({ value: code(v), rows: rs.length })).sort((a, b) => b.rows - a.rows || a.value.localeCompare(b.value))
    push(`**${file}: ${col}** (${counts.length} distinct)`, "", ...table(counts), "")
  }
}
push(
  `**students.csv: email domain:** ${[...groupBy(S, (r) => t(r.v.email).split("@")[1] ?? "")].map(([d, rs]) => `${code(d)} (${rs.length})`).join(", ")}`,
  "",
)

push("## Appendix B: Checks that found nothing", "")
sectionKeys.forEach((key) => {
  const items = clean.filter((c) => c.section === key)
  if (!items.length) return
  push(`**${SECTIONS[key]}**`, "", ...items.map((c) => `- ${c.title}${c.note ? `: ${c.note}` : ""}`), "")
})

writeFileSync(OUTPUT, out.join("\n"))
console.log(`Wrote ${OUTPUT}: ${numbered.length} findings, ${clean.length} clean checks.`)
for (const f of numbered) console.log(`  ${f.num.padEnd(5)} ${f.title} — ${quantity(f.count, f.unit)}`)
