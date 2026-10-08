import type { ImportKind } from "./fields"

export type Severity = "error" | "warning" | "info"

/** One name per data decision in docs/DECISIONS.md (D1–D23). */
export type RuleName =
  | "required_value_missing"
  | "duplicate_id_in_file"
  | "id_already_imported"
  | "date_not_iso"
  | "date_placeholder"
  | "date_unreadable"
  | "date_ambiguous"
  | "date_in_future"
  | "value_not_in_list"
  | "number_invalid"
  | "credits_outside_class_standing"
  | "email_invalid"
  | "email_shared"
  | "extra_whitespace"
  | "possible_duplicate_student"
  | "unknown_student"
  | "ssn_in_text"
  | "sensitive_content"
  | "contact_preference_in_text"
  | "follow_up_date_in_text"
  | "duplicate_note_in_file"
  | "last_contact_mismatch"
  | "note_advisor_differs"

export interface ImportRow {
  /** Position among the file's data rows, from 0. The CSV line number is index + 2. */
  index: number
  /** Current value of every field and decision field, keyed by field key. Blank is "". */
  values: Record<string, string>
  excluded: boolean
  /** Keys of warnings the person chose to keep as they are. */
  acknowledged: string[]
}

export interface Suggestion {
  label: string
  /** Values to set on the row when the suggestion is accepted. */
  set?: Record<string, string>
  /** Accepting excludes the row instead. */
  exclude?: boolean
}

export interface Issue {
  /** Stable across re-validation: rule, row and field. */
  key: string
  rule: RuleName
  severity: Severity
  rowIndex: number
  /** The field to highlight; absent for issues about the whole row. */
  field?: string
  /** Plain-language reason, shown to the person importing. */
  message: string
  /** The value as it stands, safe to display (SSN-shaped numbers masked). */
  value?: string
  /** First suggestion is the recommended one; the seed script accepts it. */
  suggestions: Suggestion[]
  /** Offer "apply to all like this": each issue of the same rule and field takes its own first suggestion. */
  bulk?: boolean
}

export interface ExistingStudent {
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
  source_last_contact_date: string | null
  newest_note_date: string | null
}

export interface ExistingNote {
  note_id: string
  student_id: string
  contact_date: string
  contact_type: string
  advisor: string
  note_text: string
}

/** A snapshot of what's already in the database, keyed by exact ID. */
export interface ExistingData {
  students: ReadonlyMap<string, ExistingStudent>
  notes: ReadonlyMap<string, ExistingNote>
}

export interface RuleContext {
  kind: ImportKind
  /** Reference "today", YYYY-MM-DD. */
  today: string
  existing: ExistingData
}

export interface Rule {
  name: RuleName
  /** The DECISIONS.md entry this rule implements, e.g. "D4". */
  decision: string
  kinds: readonly ImportKind[]
  check(rows: readonly ImportRow[], ctx: RuleContext): Issue[]
}
