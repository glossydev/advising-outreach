import type {
  ClassYear,
  ContactMethod,
  ContactNote,
  DataQualityIssue,
  ImportSummary,
  RawNoteRow,
  RawStudentRow,
  RiskFlag,
  StudentRecord,
} from "../types"
import { TODAY } from "../config"

/*
 * v0's original mock import pipeline, kept only so the mock data layer (lib/data.ts) runs
 * until Phase 4 replaces it. Superseded by lib/import/. Delete with lib/data.ts's mock store.
 */

export interface ImportResult {
  students: StudentRecord[]
  notes: ContactNote[]
  issues: DataQualityIssue[]
  summary: ImportSummary
}

const CLASS_YEARS: ClassYear[] = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"]
const RISK_FLAGS: RiskFlag[] = ["high", "medium", "low", "unknown"]
const METHODS: ContactMethod[] = ["email", "phone", "in_person", "video", "text", "other"]
const METHOD_ALIASES: Record<string, ContactMethod> = {
  zoom: "video",
  teams: "video",
  "video call": "video",
  "walk-in": "in_person",
  "walk in": "in_person",
  office: "in_person",
  "in person": "in_person",
  call: "phone",
  sms: "text",
}

type ParsedDate = { iso: string; normalized: boolean } | null

export function parseFlexibleDate(raw: string): ParsedDate {
  const value = raw.trim()
  if (!value) return null

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (iso) return validDate(+iso[1], +iso[2], +iso[3], false)

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value)
  if (us) {
    const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3])
    return validDate(year, +us[1], +us[2], true)
  }

  const slashIso = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value)
  if (slashIso) return validDate(+slashIso[1], +slashIso[2], +slashIso[3], true)

  return null
}

function validDate(y: number, m: number, d: number, normalized: boolean): ParsedDate {
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return { iso: date.toISOString().slice(0, 10), normalized }
}

class IssueCollector {
  private groups = new Map<string, DataQualityIssue>()
  readonly perStudent = new Map<string, string[]>()

  add(issue: Omit<DataQualityIssue, "affected_ids">, id: string) {
    const key = `${issue.rule}|${issue.description}`
    const existing = this.groups.get(key)
    if (existing) {
      if (!existing.affected_ids.includes(id)) existing.affected_ids.push(id)
    } else {
      this.groups.set(key, { ...issue, affected_ids: [id] })
    }
  }

  flagStudent(studentId: string, message: string) {
    const list = this.perStudent.get(studentId) ?? []
    if (!list.includes(message)) list.push(message)
    this.perStudent.set(studentId, list)
  }

  list() {
    return [...this.groups.values()]
  }
}

export function runImportPipeline(
  rawStudents: RawStudentRow[],
  rawNotes: RawNoteRow[],
  source: ImportSummary["source"],
): ImportResult {
  const issues = new IssueCollector()

  // Duplicate students: keep the row with the most recent last_contact_date.
  const byId = new Map<string, RawStudentRow[]>()
  for (const row of rawStudents) {
    const id = row.student_id.trim().toUpperCase()
    if (!id) continue
    byId.set(id, [...(byId.get(id) ?? []), { ...row, student_id: id }])
  }

  const students: StudentRecord[] = []
  for (const [id, rows] of byId) {
    let chosen = rows[0]
    if (rows.length > 1) {
      chosen = [...rows].sort((a, b) => {
        const da = parseFlexibleDate(a.last_contact_date)?.iso ?? ""
        const db = parseFlexibleDate(b.last_contact_date)?.iso ?? ""
        return db.localeCompare(da)
      })[0]
      issues.add(
        {
          rule: "duplicate_student",
          severity: "warning",
          description: "The same student_id appears on more than one row of students.csv with conflicting values.",
          resolution: "Kept the most recent row (by last_contact_date) and discarded the others.",
        },
        id,
      )
      issues.flagStudent(id, `Appeared ${rows.length} times in students.csv; kept the most recent row`)
    }

    const parsedContact = parseFlexibleDate(chosen.last_contact_date)
    if (chosen.last_contact_date.trim() && !parsedContact) {
      issues.add(
        {
          rule: "date_format",
          severity: "warning",
          description: "last_contact_date could not be parsed as a date.",
          resolution: "Treated as blank and derived from the newest note when one exists.",
        },
        id,
      )
      issues.flagStudent(id, `Unreadable last_contact_date "${chosen.last_contact_date}"`)
    } else if (parsedContact?.normalized) {
      issues.add(
        {
          rule: "date_format",
          severity: "info",
          description: "last_contact_date used a non-ISO format such as M/D/YYYY.",
          resolution: "Normalized to YYYY-MM-DD.",
        },
        id,
      )
    }

    const gpaNum = Number.parseFloat(chosen.gpa)
    const gpa = Number.isFinite(gpaNum) && gpaNum >= 0 && gpaNum <= 4.33 ? gpaNum : null
    if (gpa === null) {
      issues.add(
        {
          rule: "missing_gpa",
          severity: "info",
          description: "GPA was blank or not a number (e.g. \"N/A\", \"--\").",
          resolution: "Stored as missing. Shown as an em dash and counted in the outreach score.",
        },
        id,
      )
      issues.flagStudent(id, "GPA missing in source data")
    }

    const riskRaw = chosen.risk_flag.trim()
    const riskLower = riskRaw.toLowerCase() as RiskFlag
    let risk: RiskFlag = "unknown"
    if (RISK_FLAGS.includes(riskLower)) {
      risk = riskLower
      if (riskRaw !== riskLower) {
        issues.add(
          {
            rule: "risk_flag_case",
            severity: "info",
            description: "risk_flag used unexpected capitalization.",
            resolution: "Lowercased to match the allowed values.",
          },
          id,
        )
      }
    } else {
      issues.add(
        {
          rule: "invalid_risk_flag",
          severity: "warning",
          description: "risk_flag was not one of high, medium, low, unknown.",
          resolution: "Set to unknown.",
        },
        id,
      )
      issues.flagStudent(id, `Unrecognized risk_flag "${riskRaw || "(blank)"}"`)
    }

    const classYear = CLASS_YEARS.find((c) => c.toLowerCase() === chosen.class_year.trim().toLowerCase()) ?? "Freshman"
    const credits = Number.parseInt(chosen.credits, 10)

    students.push({
      student_id: id,
      first_name: chosen.first_name.trim(),
      last_name: chosen.last_name.trim(),
      email: chosen.email.trim().toLowerCase(),
      major: chosen.major.trim() || "Undeclared",
      class_year: classYear,
      credits: Number.isFinite(credits) ? credits : 0,
      gpa,
      advisor: chosen.advisor.trim(),
      last_contact_date: parsedContact?.iso ?? null,
      risk_flag: risk,
      import_issues: [],
    })
  }

  const studentIds = new Set(students.map((s) => s.student_id))
  const notes: ContactNote[] = []

  for (const row of rawNotes) {
    const studentId = row.student_id.trim().toUpperCase()
    const noteId = row.note_id.trim()
    if (!studentIds.has(studentId)) {
      issues.add(
        {
          rule: "orphan_note",
          severity: "error",
          description: "Note references a student_id that does not exist in students.csv.",
          resolution: "Dropped the note. Check whether the student was removed from the roster export.",
        },
        noteId,
      )
      continue
    }

    const date = parseFlexibleDate(row.contact_date)
    if (!date) {
      issues.add(
        {
          rule: "date_format",
          severity: "error",
          description: "Note contact_date could not be parsed.",
          resolution: "Dropped the note.",
        },
        noteId,
      )
      continue
    }
    if (date.normalized) {
      issues.add(
        {
          rule: "date_format",
          severity: "info",
          description: "Note contact_date used a non-ISO format such as M/D/YY.",
          resolution: "Normalized to YYYY-MM-DD.",
        },
        noteId,
      )
    }

    const methodRaw = row.method.trim().toLowerCase()
    let method: ContactMethod = "other"
    if (METHODS.includes(methodRaw as ContactMethod)) {
      method = methodRaw as ContactMethod
    } else {
      method = METHOD_ALIASES[methodRaw] ?? "other"
      issues.add(
        {
          rule: "method_normalized",
          severity: "info",
          description: "Contact method was free text instead of an allowed value.",
          resolution: "Mapped to the closest allowed method (e.g. Zoom → video, walk-in → in_person).",
        },
        noteId,
      )
    }

    const followUp = parseFlexibleDate(row.follow_up_date)?.iso ?? null
    const createdAt = Number.isNaN(Date.parse(row.created_at)) ? `${date.iso}T12:00:00Z` : row.created_at

    notes.push({
      note_id: noteId,
      student_id: studentId,
      contact_date: date.iso,
      method,
      advisor: row.advisor.trim(),
      summary: row.summary.trim(),
      body: row.body.trim(),
      follow_up_date: followUp,
      created_at: createdAt,
    })
  }

  // last_contact_date must match the newest note; the note log wins.
  const newestByStudent = new Map<string, string>()
  for (const n of notes) {
    const current = newestByStudent.get(n.student_id)
    if (!current || n.contact_date > current) newestByStudent.set(n.student_id, n.contact_date)
  }
  for (const s of students) {
    const newest = newestByStudent.get(s.student_id)
    if (newest && s.last_contact_date !== newest) {
      const hadValue = s.last_contact_date !== null
      issues.add(
        {
          rule: "last_contact_mismatch",
          severity: "warning",
          description: hadValue
            ? "last_contact_date in students.csv disagrees with the newest contact note."
            : "last_contact_date was blank or unreadable but contact notes exist.",
          resolution: "Derived from newest note.",
        },
        s.student_id,
      )
      if (hadValue) issues.flagStudent(s.student_id, "last_contact_date disagrees with newest note")
      s.last_contact_date = newest
    }
    s.import_issues = issues.perStudent.get(s.student_id) ?? []
  }

  const issueList = issues.list()
  return {
    students,
    notes,
    issues: issueList,
    summary: {
      student_count: students.length,
      note_count: notes.length,
      issue_count: issueList.length,
      imported_at: TODAY.toISOString(),
      source,
    },
  }
}

/** Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += ch
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""))
  if (!header) return []
  const keys = header.map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""))
  return body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, cells[i] ?? ""])))
}

export function toRawRows<K extends string>(records: Record<string, string>[], keys: readonly K[]) {
  return records.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? ""])) as Record<K, string>)
}

export const STUDENT_COLUMNS = [
  "student_id",
  "first_name",
  "last_name",
  "email",
  "major",
  "class_year",
  "credits",
  "gpa",
  "advisor",
  "last_contact_date",
  "risk_flag",
] as const

export const NOTE_COLUMNS = [
  "note_id",
  "student_id",
  "contact_date",
  "method",
  "advisor",
  "summary",
  "body",
  "follow_up_date",
  "created_at",
] as const
