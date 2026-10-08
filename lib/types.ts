export type RiskFlag = "high" | "medium" | "low" | "unknown"

export type ClassYear = "Freshman" | "Sophomore" | "Junior" | "Senior" | "Graduate"

export interface Student {
  student_id: string
  first_name: string
  last_name: string
  email: string
  major: string
  class_year: ClassYear
  credits: number
  gpa: number | null
  advisor: string
  last_contact_date: string | null
  risk_flag: RiskFlag
  days_since_contact: number | null
  outreach_score: number
  outreach_reasons: string[]
  data_issues: string[]
}

export type ContactMethod = "email" | "phone" | "in_person" | "video" | "text" | "other"

export interface ContactNote {
  note_id: string
  student_id: string
  contact_date: string
  method: ContactMethod
  advisor: string
  summary: string
  body: string
  follow_up_date: string | null
  created_at: string
}

export type IssueSeverity = "error" | "warning" | "info"

export interface DataQualityIssue {
  rule: string
  severity: IssueSeverity
  description: string
  affected_ids: string[]
  resolution: string
}

/** Stored student row after import, before derived outreach fields are computed. */
export type StudentRecord = Omit<
  Student,
  "days_since_contact" | "outreach_score" | "outreach_reasons" | "data_issues"
> & {
  /** Issues attached to this student by the import. */
  import_issues: string[]
}

/** Raw spreadsheet rows. Every value is an untrusted string. */
export type RawStudentRow = Record<
  | "student_id"
  | "first_name"
  | "last_name"
  | "email"
  | "major"
  | "class_year"
  | "credits"
  | "gpa"
  | "advisor"
  | "last_contact_date"
  | "risk_flag",
  string
>

export type RawNoteRow = Record<
  | "note_id"
  | "student_id"
  | "contact_date"
  | "method"
  | "advisor"
  | "summary"
  | "body"
  | "follow_up_date"
  | "created_at",
  string
>

export interface ImportSummary {
  student_count: number
  note_count: number
  issue_count: number
  imported_at: string
  source: "seed" | "upload"
}

export interface DataQualityReport {
  summary: ImportSummary
  issues: DataQualityIssue[]
}

export type LastContactFilter = "any" | "30" | "60" | "90" | "never"

export type StudentSortKey =
  | "student_id"
  | "name"
  | "major"
  | "class_year"
  | "credits"
  | "gpa"
  | "advisor"
  | "last_contact"
  | "risk"

export type SortDirection = "asc" | "desc"

export interface StudentFilters {
  advisor?: string | null
  q?: string
  major?: string
  class_years?: ClassYear[]
  risks?: RiskFlag[]
  last_contact?: LastContactFilter
  sort?: StudentSortKey
  dir?: SortDirection
}

export interface OutreachQueueFilters {
  advisor?: string | null
  risks?: RiskFlag[]
  class_years?: ClassYear[]
  min_days?: number
}

export interface OutreachStats {
  assigned: number
  overdue: number
  high_risk: number
  contacted_this_week: number
}

export interface NewNoteInput {
  student_id: string
  contact_date: string
  method: ContactMethod
  advisor: string
  summary: string
  body: string
  follow_up_date: string | null
}

export type NoteFieldErrors = Partial<Record<keyof NewNoteInput, string>>

export interface StudentIndexEntry {
  student_id: string
  name: string
  email: string
  advisor: string
}

export interface NotesSummary {
  summary: string
  suggested_opening: string
}
