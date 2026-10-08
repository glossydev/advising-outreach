/*
 * What each import kind expects, as described by the dataset's README (data/source/README.txt;
 * it first arrived empty and the hiring team sent the full file on 2026-10-08). Aliases drive
 * automatic column matching (DECISIONS P2).
 */

export type ImportKind = "students" | "notes"

export const IMPORT_KINDS: readonly ImportKind[] = ["students", "notes"]

export type FieldType = "id" | "text" | "longtext" | "email" | "integer" | "decimal" | "date" | "choice"

export interface FieldSpec {
  key: string
  label: string
  type: FieldType
  required: boolean
  /** Assumed meaning, shown on the column-matching screen. */
  description: string
  /** Other header names this field is known by. Compared ignoring case, spaces and punctuation. */
  aliases: readonly string[]
  choices?: readonly string[]
  /** Dates only: whether a date after "today" is allowed. */
  allowFuture?: boolean
}

// Allowed values follow the dataset's own spelling (DECISIONS G1).
export const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"] as const
export const RISK_FLAGS = ["Low", "Medium", "High"] as const
export const CONTACT_TYPES = ["Phone", "Email", "In person", "Zoom"] as const

/**
 * University of Arizona class standing by completed units: Sophomore 30, Junior 60, Senior 90.
 * https://archive.catalog.arizona.edu/policies/994/enrpol.htm
 */
const CLASS_STANDING: readonly [year: string, minUnits: number][] = [
  ["Freshman", 0],
  ["Sophomore", 30],
  ["Junior", 60],
  ["Senior", 90],
]

/** [min, max] completed units for a class year; max is null for Senior. Null for years without a range. */
export function classStandingRange(classYear: string): [number, number | null] | null {
  const i = CLASS_STANDING.findIndex(([year]) => year === classYear)
  if (i < 0) return null
  const next = CLASS_STANDING[i + 1]
  return [CLASS_STANDING[i][1], next ? next[1] - 1 : null]
}

export const STUDENT_FIELDS: readonly FieldSpec[] = [
  {
    key: "student_id",
    label: "Student ID",
    type: "id",
    required: true,
    description: "Unique student ID",
    aliases: ["id", "student", "student number", "student no", "sid", "emplid"],
  },
  {
    key: "first_name",
    label: "First name",
    type: "text",
    required: true,
    description: "Student's first name",
    aliases: ["first", "given name", "fname", "preferred name"],
  },
  {
    key: "last_name",
    label: "Last name",
    type: "text",
    required: true,
    description: "Student's last name",
    aliases: ["last", "surname", "family name", "lname"],
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    description: "Student's email address",
    aliases: ["email address", "e-mail", "mail", "student email"],
  },
  {
    key: "major",
    label: "Major",
    type: "text",
    required: true,
    description: "Major; \"Undeclared\" and \"Pre-Nursing\" are valid values",
    aliases: ["program", "plan", "academic plan", "major name", "degree program"],
  },
  {
    key: "class_year",
    label: "Class year",
    type: "choice",
    required: true,
    choices: CLASS_YEARS,
    description: "Freshman / Sophomore / Junior / Senior",
    aliases: ["class", "year", "class standing", "standing", "academic level"],
  },
  {
    key: "credits_earned",
    label: "Credits earned",
    type: "integer",
    required: true,
    description: "Total credits completed (what UA class standing is based on)",
    aliases: ["credits", "units", "units earned", "credit hours", "total credits", "earned credits", "completed units"],
  },
  {
    key: "gpa",
    label: "GPA",
    type: "decimal",
    required: false,
    description: "Cumulative GPA (4.0 scale)",
    aliases: ["cumulative gpa", "cum gpa", "gpa cumulative", "grade point average"],
  },
  {
    key: "advisor",
    label: "Advisor",
    type: "text",
    required: true,
    description: "Assigned advisor (last name)",
    aliases: ["adviser", "advisor name", "assigned advisor"],
  },
  {
    key: "last_contact_date",
    label: "Last contact date",
    type: "date",
    required: false,
    description: "Most recent outreach (YYYY-MM-DD); blank means never contacted",
    aliases: ["last contact", "last contacted", "date last contacted", "last contact on"],
  },
  {
    key: "risk_flag",
    label: "Risk flag",
    type: "choice",
    required: true,
    choices: RISK_FLAGS,
    description: "Low / Medium / High, as set by the advising office",
    aliases: ["risk", "risk level", "at risk", "risk rating"],
  },
]

export const NOTE_FIELDS: readonly FieldSpec[] = [
  {
    key: "note_id",
    label: "Note ID",
    type: "id",
    required: true,
    description: "Unique note ID",
    aliases: ["id", "note", "note number", "contact id"],
  },
  {
    key: "student_id",
    label: "Student ID",
    type: "id",
    required: true,
    description: "The student the note is about",
    aliases: ["student", "sid", "student number"],
  },
  {
    key: "contact_date",
    label: "Contact date",
    type: "date",
    required: true,
    description: "Date of the contact",
    aliases: ["date", "contacted on", "contact on", "note date", "date of contact"],
  },
  {
    key: "contact_type",
    label: "Contact type",
    type: "choice",
    required: true,
    choices: CONTACT_TYPES,
    description: "Phone / Email / In person / Zoom",
    aliases: ["method", "contact method", "type", "channel", "medium", "mode"],
  },
  {
    key: "advisor",
    label: "Advisor",
    type: "text",
    required: true,
    description: "The advisor who made the contact",
    aliases: ["adviser", "advisor name", "staff", "author", "written by"],
  },
  {
    key: "note_text",
    label: "Note",
    type: "longtext",
    required: true,
    description: "What was discussed",
    aliases: ["note", "notes", "text", "body", "summary", "comment", "comments", "details", "description"],
  },
]

export const FIELDS: Record<ImportKind, readonly FieldSpec[]> = { students: STUDENT_FIELDS, notes: NOTE_FIELDS }

export const ID_FIELD: Record<ImportKind, string> = { students: "student_id", notes: "note_id" }

/**
 * Values that aren't CSV columns but record a person's decision on a row: linking a possible
 * duplicate (D15), the follow-up date and sensitivity of a note (D20, D18), and a contact
 * preference to save on the student (D19). They start blank.
 */
export const DECISION_FIELDS: Record<ImportKind, readonly string[]> = {
  students: ["possible_duplicate_of"],
  notes: ["follow_up_date", "is_sensitive", "contact_preference"],
}

export function fieldLabel(kind: ImportKind, key: string): string {
  return FIELDS[kind].find((f) => f.key === key)?.label ?? key.replace(/_/g, " ")
}
