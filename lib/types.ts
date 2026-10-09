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

export type PreferredChannel = "Phone" | "Email" | "Text"

/**
 * How a student wants to be contacted (P9): one per student, on their record. Saved from a note
 * (by the import, D19, or when logging a contact) or entered on the student's page. A newer
 * statement replaces an older one.
 */
export interface ContactPreference {
  channel: PreferredChannel | null
  /** True: contact them this way only. False: this way first. */
  only: boolean
  /** The student's words or the advisor's summary, e.g. "Best reached after 5 pm". Never holds an SSN. */
  details: string
  /** When the student stated it (YYYY-MM-DD). */
  stated_on: string
  /** The note it came from; null when entered on the student's page. */
  source_note_id: string | null
}

export interface ContactPreferenceInput {
  channel: PreferredChannel | null
  only: boolean
  details: string
}

export type ContactPreferenceErrors = Partial<Record<keyof ContactPreferenceInput, string>>

/** A follow-up date on a note that hasn't been completed yet (P8). */
export interface FollowUp {
  date: string
  note_id: string
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
  /** Follow-ups not yet completed, soonest first (P8). */
  open_follow_ups: FollowUp[]
  /** The soonest open follow-up is due today or overdue: listed at the very top of the queue (P8). */
  follow_up_due: boolean
  /** Students linked during import as possibly the same person, in either direction (D15). */
  possible_duplicates: StudentLink[]
  note_count: number
}

/** A queue row: the student and their place in the outreach order, whatever the table is sorted by. */
export interface QueueStudent extends Student {
  rank: number
}

export interface ContactNote {
  note_id: string
  student_id: string
  contact_date: string
  contact_type: ContactType
  advisor: string
  note_text: string
  follow_up_date: string | null
  /** The note that completed this note's follow-up (P8); null while it's open. */
  follow_up_done_by: string | null
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
  /** Open follow-ups (by note ID) this contact completes (P8). */
  completes_follow_ups?: string[]
  /** Save the preference this note states as the student's contact preference (P9). */
  save_preference?: boolean
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

export type QueueSortKey = "rank" | "name" | "risk" | "last_contact" | "follow_up" | "score"

export interface OutreachQueueFilters {
  advisor?: string | null
  risks?: RiskFlag[]
  class_years?: ClassYear[]
  min_days?: number
  limit?: number
  /** Table order; the rank shown stays the outreach order. Defaults to rank. */
  sort?: QueueSortKey
  dir?: SortDirection
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
