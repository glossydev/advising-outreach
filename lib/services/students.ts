import { OVERDUE_DAYS, TODAY_ISO } from "@/lib/config"
import type { Db } from "@/lib/db/client"
import type { ContactNoteRow, StudentRow } from "@/lib/db/types"
import { fieldLabel } from "@/lib/import/fields"
import { ruleTitle } from "@/lib/import/rule-titles"
import { compareOutreach, scoreStudent } from "@/lib/scoring"
import type {
  ClassYear,
  ContactNote,
  ContactPreference,
  ContactType,
  OutreachQueueFilters,
  OutreachStats,
  RiskFlag,
  Student,
  StudentDataNote,
  StudentFilters,
  StudentIndexEntry,
  StudentSortKey,
} from "@/lib/types"

/*
 * Students as advisors see them: stored data plus what's worked out from it (last contact, the
 * outreach score and its reasons, linked duplicates). Scores are computed on read from the notes,
 * so logging a note changes the queue immediately. For a caseload of hundreds that's instant; a
 * large office would cache scores instead.
 */

const fullName = (s: { first_name: string; last_name: string }) => `${s.first_name} ${s.last_name}`

export function toContactNote(row: ContactNoteRow): ContactNote {
  return {
    note_id: row.note_id,
    student_id: row.student_id,
    contact_date: row.contact_date,
    contact_type: row.contact_type as ContactType,
    advisor: row.advisor,
    note_text: row.note_text,
    follow_up_date: row.follow_up_date,
    is_sensitive: Number(row.is_sensitive) === 1,
    source: row.source === "app" ? "app" : "import",
    created_at: row.created_at,
  }
}

function parsePreference(json: string | null): ContactPreference | null {
  if (!json) return null
  try {
    return JSON.parse(json) as ContactPreference
  } catch {
    return null
  }
}

interface Loaded {
  rows: StudentRow[]
  notesByStudent: Map<string, ContactNoteRow[]>
}

async function load(db: Db, where?: { studentId: string }): Promise<Loaded> {
  let students = db.selectFrom("students").selectAll()
  let notes = db.selectFrom("contact_notes").selectAll()
  if (where) {
    // The student, plus anyone linked to them as a possible duplicate (for names on the banner).
    students = students.where((eb) =>
      eb.or([
        eb("student_id", "=", where.studentId),
        eb("possible_duplicate_of", "=", where.studentId),
        eb(
          "student_id",
          "in",
          eb.selectFrom("students as s").select("s.possible_duplicate_of").where("s.student_id", "=", where.studentId),
        ),
      ]),
    )
    notes = notes.where("student_id", "=", where.studentId)
  }
  const [rows, noteRows] = await Promise.all([students.execute(), notes.execute()])
  const notesByStudent = new Map<string, ContactNoteRow[]>()
  for (const n of noteRows) notesByStudent.set(n.student_id, [...(notesByStudent.get(n.student_id) ?? []), n])
  return { rows, notesByStudent }
}

function derive({ rows, notesByStudent }: Loaded, today: string): Student[] {
  const byId = new Map(rows.map((r) => [r.student_id, r]))
  const linkedTo = new Map<string, string[]>()
  for (const r of rows) {
    if (r.possible_duplicate_of) linkedTo.set(r.possible_duplicate_of, [...(linkedTo.get(r.possible_duplicate_of) ?? []), r.student_id])
  }

  return rows.map((row) => {
    const notes = notesByStudent.get(row.student_id) ?? []
    const gpa = row.gpa === null ? null : Number(row.gpa)
    const credits = Number(row.credits_earned)
    const outreach = scoreStudent(
      { ...row, gpa, credits_earned: credits },
      notes.map((n) => ({ note_id: n.note_id, contact_date: n.contact_date, note_text: n.note_text, follow_up_date: n.follow_up_date })),
      today,
    )
    const linkIds = [...(row.possible_duplicate_of ? [row.possible_duplicate_of] : []), ...(linkedTo.get(row.student_id) ?? [])]
    return {
      student_id: row.student_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      major: row.major,
      class_year: row.class_year as ClassYear,
      credits_earned: credits,
      gpa,
      advisor: row.advisor,
      risk_flag: row.risk_flag as RiskFlag,
      source_last_contact_date: row.source_last_contact_date,
      last_contact_date: outreach.lastContact?.date ?? null,
      last_contact_source: outreach.lastContact?.source ?? null,
      days_since_contact: outreach.daysSinceContact,
      no_contact_on_record: outreach.noContactOnRecord,
      outreach_score: outreach.score,
      outreach_reasons: outreach.reasons,
      contact_preference: parsePreference(row.contact_preference),
      possible_duplicates: [...new Set(linkIds)].map((id) => {
        const other = byId.get(id)
        return { student_id: id, name: other ? fullName(other) : id }
      }),
      note_count: notes.length,
    }
  })
}

const RISK_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const YEAR_ORDER: Record<string, number> = { Freshman: 0, Sophomore: 1, Junior: 2, Senior: 3 }

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
        return (YEAR_ORDER[a.class_year] ?? 9) - (YEAR_ORDER[b.class_year] ?? 9)
      case "credits":
        return a.credits_earned - b.credits_earned
      case "gpa":
        return (a.gpa ?? -1) - (b.gpa ?? -1)
      case "advisor":
        return a.advisor.localeCompare(b.advisor)
      case "last_contact":
        return (a.last_contact_date ?? "").localeCompare(b.last_contact_date ?? "")
      case "risk":
        return (RISK_ORDER[a.risk_flag] ?? 9) - (RISK_ORDER[b.risk_flag] ?? 9)
      case "score":
        return a.outreach_score - b.outreach_score
    }
  }
}

const sortName = (s: Student) => `${s.last_name}, ${s.first_name}`

export async function listStudents(db: Db, filters: StudentFilters = {}, today = TODAY_ISO): Promise<Student[]> {
  const q = filters.q?.trim().toLowerCase()
  const result = derive(await load(db), today).filter((s) => {
    if (filters.advisor && s.advisor !== filters.advisor) return false
    if (q && !`${s.first_name} ${s.last_name} ${s.student_id} ${s.email}`.toLowerCase().includes(q)) return false
    if (filters.major && s.major !== filters.major) return false
    if (filters.class_years?.length && !filters.class_years.includes(s.class_year)) return false
    if (filters.risks?.length && !filters.risks.includes(s.risk_flag)) return false
    switch (filters.last_contact) {
      case "none":
        return s.no_contact_on_record
      case "30":
      case "60":
      case "90":
        return s.no_contact_on_record || (s.days_since_contact ?? 0) >= Number(filters.last_contact)
      default:
        return true
    }
  })
  const sorter = compareBy(filters.sort ?? "name")
  const byName = compareBy("name")
  return result.sort((a, b) => (filters.dir === "desc" ? -sorter(a, b) : sorter(a, b)) || byName(a, b))
}

/** The ranked outreach queue: never contacted first, then by score (D24). */
export async function getOutreachQueue(db: Db, filters: OutreachQueueFilters = {}, today = TODAY_ISO): Promise<Student[]> {
  const ranked = derive(await load(db), today)
    .filter((s) => !filters.advisor || s.advisor === filters.advisor)
    .filter((s) => !filters.risks?.length || filters.risks.includes(s.risk_flag))
    .filter((s) => !filters.class_years?.length || filters.class_years.includes(s.class_year))
    .filter((s) => !filters.min_days || s.no_contact_on_record || (s.days_since_contact ?? 0) >= filters.min_days)
    .map((s) => ({ s, sortName: sortName(s), outreach: { score: s.outreach_score, noContactOnRecord: s.no_contact_on_record } }))
    .sort(compareOutreach)
    .map((x) => x.s)
  return filters.limit ? ranked.slice(0, filters.limit) : ranked
}

export async function getOutreachStats(db: Db, advisor?: string | null, today = TODAY_ISO): Promise<OutreachStats> {
  const students = derive(await load(db), today).filter((s) => !advisor || s.advisor === advisor)
  return {
    assigned: students.length,
    overdue: students.filter((s) => s.no_contact_on_record || (s.days_since_contact ?? 0) >= OVERDUE_DAYS).length,
    high_risk: students.filter((s) => s.risk_flag === "High").length,
    contacted_this_week: students.filter((s) => s.days_since_contact !== null && s.days_since_contact < 7).length,
  }
}

export async function getStudent(db: Db, studentId: string, today = TODAY_ISO): Promise<Student | null> {
  const id = studentId.trim()
  return derive(await load(db, { studentId: id }), today).find((s) => s.student_id === id) ?? null
}

/** Newest first. */
export async function listNotes(db: Db, studentId: string): Promise<ContactNote[]> {
  const rows = await db
    .selectFrom("contact_notes")
    .selectAll()
    .where("student_id", "=", studentId)
    .orderBy("contact_date", "desc")
    .orderBy("created_at", "desc")
    .orderBy("note_id", "desc")
    .execute()
  return rows.map(toContactNote)
}

const RESOLUTION_TEXT: Record<string, (by: string) => string> = {
  accepted_suggestion: (by) => (by === "seed" ? "Suggested fix accepted (sample data load)" : "Suggested fix accepted during import"),
  edited: () => "Corrected by hand during import",
  kept_as_is: () => "Reviewed and kept as it was",
  excluded_row: () => "Row left out of the import",
  info: () => "Noted during import",
}

/** What the imports found and did about this student's record and notes (DECISIONS G2). */
export async function getStudentDataNotes(db: Db, studentId: string): Promise<StudentDataNote[]> {
  const noteIds = (await db.selectFrom("contact_notes").select("note_id").where("student_id", "=", studentId).execute()).map(
    (n) => n.note_id,
  )
  const rows = await db
    .selectFrom("import_issues")
    .innerJoin("imports", "imports.import_id", "import_issues.import_id")
    .select([
      "import_issues.rule",
      "import_issues.message",
      "import_issues.resolution",
      "import_issues.record_id",
      "import_issues.field",
      "import_issues.original_value",
      "import_issues.final_value",
      "imports.kind",
      "imports.accepted_by",
      "imports.created_at",
    ])
    .where((eb) =>
      eb.or([
        eb.and([eb("imports.kind", "=", "students"), eb("import_issues.record_id", "=", studentId)]),
        ...(noteIds.length ? [eb.and([eb("imports.kind", "=", "notes"), eb("import_issues.record_id", "in", noteIds)])] : []),
      ]),
    )
    .where("import_issues.rule", "!=", "id_already_imported")
    .orderBy("imports.created_at")
    .execute()

  return rows.map((r) => {
    const changed = r.original_value !== null && r.final_value !== null && r.original_value !== r.final_value
    const where = r.field ? `${r.kind === "notes" ? `Note ${r.record_id}, ` : ""}${fieldLabel(r.kind === "notes" ? "notes" : "students", r.field)}` : null
    return {
      rule: r.rule,
      title: ruleTitle(r.rule),
      message: changed && where && r.rule !== "sensitive_content" && r.rule !== "contact_preference_in_text"
        ? `${where}: "${r.original_value || "blank"}" → "${r.final_value || "blank"}"`
        : r.message,
      resolution: (RESOLUTION_TEXT[r.resolution] ?? (() => r.resolution))(r.accepted_by),
      record_id: r.record_id,
    }
  })
}

export async function getAdvisors(db: Db): Promise<string[]> {
  const rows = await db.selectFrom("students").select("advisor").distinct().orderBy("advisor").execute()
  return rows.map((r) => r.advisor)
}

export async function getMajors(db: Db): Promise<string[]> {
  const rows = await db.selectFrom("students").select("major").distinct().orderBy("major").execute()
  return rows.map((r) => r.major)
}

export async function getStudentIndex(db: Db): Promise<StudentIndexEntry[]> {
  const rows = await db
    .selectFrom("students")
    .select(["student_id", "first_name", "last_name", "email", "advisor"])
    .orderBy("last_name")
    .orderBy("first_name")
    .execute()
  return rows.map((r) => ({ student_id: r.student_id, name: fullName(r), email: r.email, advisor: r.advisor }))
}

export async function countRecords(db: Db): Promise<{ students: number; notes: number }> {
  const [s, n] = await Promise.all([
    db.selectFrom("students").select((eb) => eb.fn.countAll().as("n")).executeTakeFirstOrThrow(),
    db.selectFrom("contact_notes").select((eb) => eb.fn.countAll().as("n")).executeTakeFirstOrThrow(),
  ])
  return { students: Number(s.n), notes: Number(n.n) }
}
