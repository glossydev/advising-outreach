import type { Selectable } from "kysely"

/*
 * Table shapes shared by SQLite and Postgres (DECISIONS T2): dates and JSON are ISO/JSON text,
 * true/false is 0/1, IDs are text. Nothing here may depend on one database's special types.
 */

export interface StudentsTable {
  student_id: string
  first_name: string
  last_name: string
  email: string
  major: string
  class_year: string
  credits_earned: number
  gpa: number | null
  advisor: string
  risk_flag: string
  /** last_contact_date exactly as the spreadsheet had it, after the import's fixes (D22). */
  source_last_contact_date: string | null
  /** JSON ContactPreference (P9), from a note or entered on the student's page. Read with parsePreference. */
  contact_preference: string | null
  /** Soft link to another student who may be the same person (D15). */
  possible_duplicate_of: string | null
  import_id: string | null
  created_at: string
  updated_at: string
}

export interface ContactNotesTable {
  note_id: string
  student_id: string
  contact_date: string
  contact_type: string
  advisor: string
  note_text: string
  follow_up_date: string | null
  /** The note that completed this follow-up (P8); null while it's open. Added in migration 0002. */
  follow_up_done_by: string | null
  /** 0/1 (D18). */
  is_sensitive: number
  /** "import" or "app". */
  source: string
  import_id: string | null
  created_at: string
}

export interface ImportsTable {
  import_id: string
  /** "students" or "notes". */
  kind: string
  source_name: string
  /** "upload", "sample" or "seed". */
  source_kind: string
  source_sha256: string
  /** "person" or "seed". */
  accepted_by: string
  /** JSON list of { field, header, kind }. */
  column_mapping: string
  rows_in_file: number
  rows_added: number
  rows_updated: number
  rows_unchanged: number
  rows_excluded: number
  created_at: string
}

/** One row per flagged value and what happened to it: the import's fix history. */
export interface ImportIssuesTable {
  id: string
  import_id: string
  rule: string
  severity: string
  /** CSV line number (the header is line 1). */
  row_number: number
  record_id: string | null
  field: string | null
  message: string
  /** SSN-shaped numbers are always masked before they are stored (D17). */
  original_value: string | null
  final_value: string | null
  /** accepted_suggestion | edited | excluded_row | kept_as_is | info */
  resolution: string
}

export interface AppMetaTable {
  key: string
  value: string
}

export interface DatabaseSchema {
  students: StudentsTable
  contact_notes: ContactNotesTable
  imports: ImportsTable
  import_issues: ImportIssuesTable
  app_meta: AppMetaTable
}

export type StudentRow = Selectable<StudentsTable>
export type ContactNoteRow = Selectable<ContactNotesTable>
export type ImportRecordRow = Selectable<ImportsTable>
export type ImportIssueRow = Selectable<ImportIssuesTable>
