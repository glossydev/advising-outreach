import type { RuleName } from "./types"

/**
 * Plain-language names for each rule, for the pages. Kept apart from the rule code so the browser
 * can show them without loading every rule. Keys match the rule names in DECISIONS.md.
 */
export const RULE_TITLES: Record<RuleName | "manual_edit" | "excluded_by_person", { decision: string | null; title: string }> = {
  required_value_missing: { decision: "D1", title: "Required value missing" },
  duplicate_id_in_file: { decision: "D2", title: "Same ID twice in the file" },
  id_already_imported: { decision: "D3", title: "Already in the database" },
  date_not_iso: { decision: "D4", title: "Date not in YYYY-MM-DD format" },
  date_placeholder: { decision: "D5", title: "Placeholder instead of a date" },
  date_unreadable: { decision: "D6", title: "Unreadable date" },
  date_ambiguous: { decision: "D7", title: "Date could be month-first or day-first" },
  date_in_future: { decision: "D8", title: "Date after today" },
  value_not_in_list: { decision: "D9", title: "Value not in the allowed list" },
  number_invalid: { decision: "D10", title: "Invalid number" },
  credits_outside_class_standing: { decision: "D11", title: "Credits outside the class-standing range" },
  email_invalid: { decision: "D12", title: "Invalid email address" },
  email_shared: { decision: "D13", title: "Email shared with another student" },
  extra_whitespace: { decision: "D14", title: "Extra spaces" },
  possible_duplicate_student: { decision: "D15", title: "Possibly the same student twice" },
  unknown_student: { decision: "D16", title: "Note for an unknown student" },
  ssn_in_text: { decision: "D17", title: "Social Security number in a note" },
  sensitive_content: { decision: "D18", title: "Sensitive note" },
  contact_preference_in_text: { decision: "D19", title: "Contact preference in a note" },
  follow_up_date_in_text: { decision: "D20", title: "Follow-up date in a note" },
  duplicate_note_in_file: { decision: "D21", title: "Same note twice in the file" },
  last_contact_mismatch: { decision: "D22", title: "Spreadsheet and notes disagree on last contact" },
  note_advisor_differs: { decision: "D23", title: "Note by a different advisor" },
  manual_edit: { decision: null, title: "Edited by the person importing" },
  excluded_by_person: { decision: null, title: "Row excluded by the person importing" },
}

export function ruleTitle(rule: string): string {
  return RULE_TITLES[rule as keyof typeof RULE_TITLES]?.title ?? rule.replace(/_/g, " ")
}
