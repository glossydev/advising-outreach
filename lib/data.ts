import "server-only"

import type {
  ClassYear,
  ContactNote,
  DataQualityReport,
  NewNoteInput,
  NoteFieldErrors,
  NotesSummary,
  OutreachQueueFilters,
  OutreachStats,
  RiskFlag,
  Student,
  StudentFilters,
  StudentIndexEntry,
  StudentSortKey,
} from "./types"
import { OVERDUE_DAYS, TODAY } from "./config"
import { SEED } from "./mock-data"
import { NOTE_COLUMNS, STUDENT_COLUMNS, parseCsv, runImportPipeline, toRawRows, type ImportResult } from "./import"
import { deriveStudent } from "./scoring"
import { validateNoteInput } from "./validation"
import { METHOD_LABELS, formatDate, fullName } from "./format"

/**
 * Prototype data layer backed by in-memory mock data.
 * Replace the bodies of these functions with real API calls; keep the signatures.
 */

const globalStore = globalThis as unknown as { __advisingStore?: ImportResult }

function store(): ImportResult {
  if (!globalStore.__advisingStore) {
    globalStore.__advisingStore = runImportPipeline(SEED.students, SEED.notes, "seed")
  }
  return globalStore.__advisingStore
}

function notesFor(studentId: string) {
  return store().notes.filter((n) => n.student_id === studentId)
}

function allStudents(): Student[] {
  const { students, notes } = store()
  const grouped = new Map<string, ContactNote[]>()
  for (const n of notes) grouped.set(n.student_id, [...(grouped.get(n.student_id) ?? []), n])
  return students.map((s) => deriveStudent(s, grouped.get(s.student_id) ?? []))
}

function matchesAdvisor(s: Student, advisor?: string | null) {
  return !advisor || s.advisor === advisor
}

const RISK_ORDER: Record<RiskFlag, number> = { high: 0, medium: 1, unknown: 2, low: 3 }
const YEAR_ORDER: Record<ClassYear, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3, Graduate: 4 }

function compareBy(key: StudentSortKey) {
  return (a: Student, b: Student): number => {
    switch (key) {
      case "student_id":
        return a.student_id.localeCompare(b.student_id)
      case "name":
        return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      case "major":
        return a.major.localeCompare(b.major)
      case "class_year":
        return YEAR_ORDER[a.class_year] - YEAR_ORDER[b.class_year]
      case "credits":
        return a.credits - b.credits
      case "gpa":
        return (a.gpa ?? -1) - (b.gpa ?? -1)
      case "advisor":
        return a.advisor.localeCompare(b.advisor)
      case "last_contact":
        return (a.last_contact_date ?? "").localeCompare(b.last_contact_date ?? "")
      case "risk":
        return RISK_ORDER[a.risk_flag] - RISK_ORDER[b.risk_flag]
    }
  }
}

export async function getStudents(filters: StudentFilters = {}): Promise<Student[]> {
  const q = filters.q?.trim().toLowerCase()
  const result = allStudents().filter((s) => {
    if (!matchesAdvisor(s, filters.advisor)) return false
    if (q) {
      const haystack = `${s.first_name} ${s.last_name} ${s.student_id} ${s.email}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (filters.major && s.major !== filters.major) return false
    if (filters.class_years?.length && !filters.class_years.includes(s.class_year)) return false
    if (filters.risks?.length && !filters.risks.includes(s.risk_flag)) return false
    switch (filters.last_contact) {
      case "never":
        return s.days_since_contact === null
      case "30":
      case "60":
      case "90":
        return s.days_since_contact === null || s.days_since_contact >= Number(filters.last_contact)
      default:
        return true
    }
  })

  const sorter = compareBy(filters.sort ?? "name")
  result.sort((a, b) => {
    const diff = sorter(a, b)
    return filters.dir === "desc" ? -diff : diff
  })
  return result
}

export async function getStudent(id: string): Promise<Student | null> {
  const record = store().students.find((s) => s.student_id === id.toUpperCase())
  return record ? deriveStudent(record, notesFor(record.student_id)) : null
}

export async function getNotes(studentId: string): Promise<ContactNote[]> {
  return notesFor(studentId).sort(
    (a, b) => b.contact_date.localeCompare(a.contact_date) || b.created_at.localeCompare(a.created_at),
  )
}

export async function addNote(
  input: NewNoteInput,
): Promise<{ ok: true; note: ContactNote } | { ok: false; errors: NoteFieldErrors }> {
  const errors = validateNoteInput(input)
  if (!(await getStudent(input.student_id))) errors.student_id = "Student not found."
  if (Object.keys(errors).length) return { ok: false, errors }

  const note: ContactNote = {
    note_id: `N${Date.now().toString(36).toUpperCase()}`,
    student_id: input.student_id,
    contact_date: input.contact_date,
    method: input.method,
    advisor: input.advisor,
    summary: input.summary.trim(),
    body: input.body.trim(),
    follow_up_date: input.follow_up_date || null,
    created_at: new Date().toISOString(),
  }
  store().notes.push(note)
  return { ok: true, note }
}

export async function getOutreachQueue(filters: OutreachQueueFilters = {}): Promise<Student[]> {
  return allStudents()
    .filter((s) => matchesAdvisor(s, filters.advisor))
    .filter((s) => !filters.risks?.length || filters.risks.includes(s.risk_flag))
    .filter((s) => !filters.class_years?.length || filters.class_years.includes(s.class_year))
    .filter((s) => !filters.min_days || s.days_since_contact === null || s.days_since_contact >= filters.min_days)
    .sort((a, b) => b.outreach_score - a.outreach_score || a.last_name.localeCompare(b.last_name))
}

export async function getOutreachStats(advisor?: string | null): Promise<OutreachStats> {
  const students = allStudents().filter((s) => matchesAdvisor(s, advisor))
  return {
    assigned: students.length,
    overdue: students.filter((s) => s.days_since_contact === null || s.days_since_contact >= OVERDUE_DAYS).length,
    high_risk: students.filter((s) => s.risk_flag === "high").length,
    contacted_this_week: students.filter((s) => s.days_since_contact !== null && s.days_since_contact < 7).length,
  }
}

export async function getAdvisors(): Promise<string[]> {
  return [...new Set(store().students.map((s) => s.advisor))].sort()
}

export async function getMajors(): Promise<string[]> {
  return [...new Set(store().students.map((s) => s.major))].sort()
}

export async function getStudentIndex(): Promise<StudentIndexEntry[]> {
  return store()
    .students.map((s) => ({ student_id: s.student_id, name: fullName(s), email: s.email, advisor: s.advisor }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getDataQualityReport(): Promise<DataQualityReport> {
  const { summary, issues } = store()
  return { summary, issues }
}

export async function importFromCsv(studentsCsv: string, notesCsv: string): Promise<DataQualityReport> {
  const students = toRawRows(parseCsv(studentsCsv), STUDENT_COLUMNS)
  const notes = toRawRows(parseCsv(notesCsv), NOTE_COLUMNS)
  if (students.length === 0) throw new Error("students.csv has no rows.")
  globalStore.__advisingStore = runImportPipeline(students, notes, "upload")
  return getDataQualityReport()
}

export async function resetToSeed(): Promise<DataQualityReport> {
  globalStore.__advisingStore = runImportPipeline(SEED.students, SEED.notes, "seed")
  return getDataQualityReport()
}

/** Mock stand-in for an LLM summary of past notes. Swap for a real model call. */
export async function getNotesSummary(studentId: string): Promise<NotesSummary | null> {
  const [student, notes] = await Promise.all([getStudent(studentId), getNotes(studentId)])
  if (!student || notes.length === 0) return null

  const recent = notes.slice(0, 3)
  const methods = [...new Set(recent.map((n) => METHOD_LABELS[n.method].toLowerCase()))]
  const topics = recent.map((n) => n.summary.charAt(0).toLowerCase() + n.summary.slice(1))
  const openFollowUp = notes.find((n) => n.follow_up_date && n.follow_up_date >= TODAY.toISOString().slice(0, 10))

  const summary =
    `${student.first_name} has ${notes.length} advising contact${notes.length === 1 ? "" : "s"} on record, ` +
    `most recently on ${formatDate(notes[0].contact_date)} by ${methods.join(" and ")}. ` +
    `Recent conversations covered ${topics.join("; ")}.` +
    (openFollowUp ? ` A follow-up is planned by ${formatDate(openFollowUp.follow_up_date)}.` : "")

  const suggested_opening = `Hi ${student.first_name}, I wanted to check in on how things have gone since we talked about ${topics[0]}. Do you have 15 minutes this week?`

  return { summary, suggested_opening }
}
