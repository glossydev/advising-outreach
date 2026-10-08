/*
 * Shapes shared by the pages, the API and the services. Vocabulary follows the dataset
 * (DECISIONS G1): risk flags are Low/Medium/High, contact types are Phone/Email/In person/Zoom,
 * and a note is a single note_text.
 */

import type { CLASS_YEARS, CONTACT_TYPES, RISK_FLAGS } from "./import/fields"
import type { Severity } from "./import/types"

export type RiskFlag = (typeof RISK_FLAGS)[number]
export type ClassYear = (typeof CLASS_YEARS)[number]
export type ContactType = (typeof CONTACT_TYPES)[number]

export interface OutreachReason {
  rule: string
  points: number
  text: string
}

/** Saved from a note during import (D19). */
export interface ContactPreference {
  channel: "Phone" | "Email" | "Text" | null
  text: string
  note_id: string
  noted_on: string | null
}

export interface StudentLink {
  student_id: string
  name: string
}

export interface Student {
  student_id: string
  first_name: string
  last_name: string
  email: string
  major: string
  class_year: ClassYear
  credits_earned: number
  gpa: number | null
  advisor: string
  risk_flag: RiskFlag
  /** The spreadsheet's last_contact_date, as imported. */
  source_last_contact_date: string | null
  /** The later of the newest note and the spreadsheet date (D22). */
  last_contact_date: string | null
  last_contact_source: "note" | "spreadsheet" | null
  days_since_contact: number | null
  /** No notes and no spreadsheet date (D24). */
  no_contact_on_record: boolean
  outreach_score: number
  outreach_reasons: OutreachReason[]
  contact_preference: ContactPreference | null
  /** Students linked during import as possibly the same person, in either direction (D15). */
  possible_duplicates: StudentLink[]
  note_count: number
}

export interface ContactNote {
  note_id: string
  student_id: string
  contact_date: string
  contact_type: ContactType
  advisor: string
  note_text: string
  follow_up_date: string | null
  is_sensitive: boolean
  /** "import" for notes from a CSV, "app" for notes logged here. */
  source: "import" | "app"
  created_at: string
}

/** What the import found and did about one student's data, for the detail page. */
export interface StudentDataNote {
  rule: string
  title: string
  message: string
  resolution: string
  record_id: string | null
}

export interface NewNoteInput {
  contact_date: string
  contact_type: string
  advisor: string
  note_text: string
  follow_up_date: string | null
  is_sensitive: boolean
}

export type NoteFieldErrors = Partial<Record<keyof NewNoteInput, string>>

export type LastContactFilter = "any" | "30" | "60" | "90" | "none"

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
  | "score"

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
  limit?: number
}

export interface OutreachStats {
  assigned: number
  overdue: number
  high_risk: number
  contacted_this_week: number
}

export interface StudentIndexEntry {
  student_id: string
  name: string
  email: string
  advisor: string
}

export interface ImportSummaryRow {
  import_id: string
  kind: "students" | "notes"
  source_name: string
  source_kind: "upload" | "sample" | "seed"
  accepted_by: "person" | "seed"
  rows_in_file: number
  rows_added: number
  rows_updated: number
  rows_unchanged: number
  rows_excluded: number
  created_at: string
}

/** One rule's results across the imports shown on the Data Quality page. */
export interface RuleSummary {
  rule: string
  title: string
  decision: string | null
  severity: Severity
  count: number
  resolutions: Record<string, number>
  records: string[]
  examples: { record_id: string | null; message: string; original_value: string | null; final_value: string | null }[]
}

export interface DataQualityReport {
  imports: ImportSummaryRow[]
  rules: RuleSummary[]
  totals: { fixes_accepted: number; edited: number; kept_as_is: number; rows_excluded: number; info: number }
}
