import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { buildCommitPlan } from "@/lib/import/plan"
import { setValue } from "@/lib/import/resolve"
import { RULES } from "@/lib/import/rules"
import { extractContactPreference } from "@/lib/import/text"
import { validateRows } from "@/lib/import/validate"
import { TODAY, existingData, existingStudent, noteLine, ofRule, scan, studentLine } from "../helpers"

/*
 * One describe per rule (D1–D23 in docs/DECISIONS.md): when it fires, what it suggests, and when
 * it stays quiet. Fixtures are tiny inline CSVs built from a known-clean row.
 */

describe("clean files", () => {
  it("raise no issues at all", () => {
    expect(scan("students", [studentLine(), studentLine({ student_id: "S2", first_name: "Jordan", last_name: "Whitfield", email: "jordan.whitfield@example.edu" })]).issues).toEqual([])
    // N2 is older than N1, so the newest note matches the stored student's spreadsheet date (no D22 info).
    expect(scan("notes", [noteLine(), noteLine({ note_id: "N2", contact_date: "2026-09-01", note_text: "Checked in." })]).issues).toEqual([])
  })
})

describe("D1 required_value_missing", () => {
  it("blocks a blank required value and offers no guess", () => {
    const [issue] = ofRule(scan("students", [studentLine({ last_name: " " })]).issues, "required_value_missing")
    expect(issue).toMatchObject({ severity: "error", field: "last_name", suggestions: [] })
    expect(ofRule(scan("notes", [noteLine({ note_text: "" })]).issues, "required_value_missing")[0].field).toBe("note_text")
  })
  it("allows blank optional values", () => {
    expect(ofRule(scan("students", [studentLine({ gpa: "", last_contact_date: "" })]).issues, "required_value_missing")).toEqual([])
  })
})

describe("D2 duplicate_id_in_file", () => {
  it("flags the later of two identical rows as a copy", () => {
    const [issue] = ofRule(scan("students", [studentLine(), studentLine()]).issues, "duplicate_id_in_file")
    expect(issue).toMatchObject({ rowIndex: 1, severity: "error" })
    expect(issue.message).toMatch(/Exact copy of row 2/)
    expect(issue.suggestions[0]).toMatchObject({ exclude: true })
  })
  it("says so when the duplicates differ", () => {
    const [issue] = ofRule(scan("students", [studentLine(), studentLine({ major: "Chemistry" })]).issues, "duplicate_id_in_file")
    expect(issue.message).toMatch(/different details/)
  })
})

describe("D3 id_already_imported", () => {
  it("is informational when the stored student is identical", () => {
    const issues = scan("students", [studentLine()], existingData([existingStudent()])).issues
    expect(ofRule(issues, "id_already_imported")[0]).toMatchObject({ severity: "info" })
  })
  it("warns and lists what an update would change", () => {
    const issues = scan("students", [studentLine({ major: "Chemistry" })], existingData([existingStudent()])).issues
    const [issue] = ofRule(issues, "id_already_imported")
    expect(issue.severity).toBe("warning")
    expect(issue.message).toContain("Major (Biology → Chemistry)")
  })
  it("skips a note already imported, comparing against the SSN-free stored text", () => {
    const stored = { note_id: "N1", student_id: "S1", contact_date: "2026-09-18", contact_type: "In person", advisor: "Okafor", note_text: "Form help; SSN [SSN removed] given." }
    const existing = existingData([existingStudent()], [stored])
    const issues = scan("notes", [noteLine({ note_text: "Form help; SSN 000-12-3456 given." })], existing).issues
    expect(ofRule(issues, "id_already_imported")[0].severity).toBe("info")
  })
  it("blocks a different note under an ID already in use", () => {
    const stored = { note_id: "N1", student_id: "S1", contact_date: "2026-09-01", contact_type: "Email", advisor: "Okafor", note_text: "Other." }
    const [issue] = ofRule(scan("notes", [noteLine()], existingData([existingStudent()], [stored])).issues, "id_already_imported")
    expect(issue).toMatchObject({ severity: "error" })
    expect(issue.suggestions[0]).toMatchObject({ exclude: true })
  })
})

describe("D4 date_not_iso", () => {
  it.each([
    ["Aug 25, 2026", "2026-08-25"],
    ["30-Aug-2026", "2026-08-30"],
    ["2026/09/02", "2026-09-02"],
    ["09/16/2026", "2026-09-16"],
  ])("offers %j → %s, with apply-to-all", (raw, iso) => {
    const [issue] = ofRule(scan("notes", [noteLine({ contact_date: raw })]).issues, "date_not_iso")
    expect(issue).toMatchObject({ severity: "error", field: "contact_date", bulk: true })
    expect(issue.suggestions[0].set).toEqual({ contact_date: iso })
  })
  it("leaves ISO dates alone", () => {
    expect(ofRule(scan("notes", [noteLine()]).issues, "date_not_iso")).toEqual([])
  })
})

describe("D5 date_placeholder", () => {
  it("offers to clear an optional date", () => {
    const [issue] = ofRule(scan("students", [studentLine({ last_contact_date: "N/A" })]).issues, "date_placeholder")
    expect(issue.suggestions[0].set).toEqual({ last_contact_date: "" })
  })
  it("offers nothing for a required date", () => {
    const [issue] = ofRule(scan("notes", [noteLine({ contact_date: "TBD" })]).issues, "date_placeholder")
    expect(issue.suggestions).toEqual([])
  })
})

describe("D6 date_unreadable", () => {
  it("blocks text and impossible dates without guessing", () => {
    for (const raw of ["sometime in May", "2026-02-30"]) {
      const [issue] = ofRule(scan("notes", [noteLine({ contact_date: raw })]).issues, "date_unreadable")
      expect(issue).toMatchObject({ severity: "error", suggestions: [] })
    }
  })
})

describe("D7 date_ambiguous", () => {
  it("offers both readings", () => {
    const [issue] = ofRule(scan("notes", [noteLine({ contact_date: "03/04/2026" })]).issues, "date_ambiguous")
    expect(issue.suggestions.map((s) => s.set?.contact_date)).toEqual(["2026-03-04", "2026-04-03"])
    expect(ofRule(scan("notes", [noteLine({ contact_date: "03/04/2026" })]).issues, "date_not_iso")).toEqual([])
  })
})

describe("D8 date_in_future", () => {
  it("blocks a contact after today", () => {
    expect(ofRule(scan("notes", [noteLine({ contact_date: "2026-10-06" })]).issues, "date_in_future")).toHaveLength(1)
    expect(ofRule(scan("notes", [noteLine({ contact_date: TODAY })]).issues, "date_in_future")).toEqual([])
  })
})

describe("D9 value_not_in_list", () => {
  it("suggests the allowed spelling when only case or punctuation differs", () => {
    const risk = ofRule(scan("students", [studentLine({ risk_flag: "low" })]).issues, "value_not_in_list")[0]
    expect(risk.suggestions[0].set).toEqual({ risk_flag: "Low" })
    const type = ofRule(scan("notes", [noteLine({ contact_type: "In-person" })]).issues, "value_not_in_list")[0]
    expect(type.suggestions[0].set).toEqual({ contact_type: "In person" })
  })
  it("offers no guess for an unknown value", () => {
    const [issue] = ofRule(scan("students", [studentLine({ risk_flag: "Severe" })]).issues, "value_not_in_list")
    expect(issue.suggestions).toEqual([])
    expect(issue.message).toContain("Low, Medium, High")
  })
})

describe("D10 number_invalid", () => {
  it("blocks a GPA outside 0–4 and offers to blank a placeholder GPA", () => {
    expect(ofRule(scan("students", [studentLine({ gpa: "4.3" })]).issues, "number_invalid")[0].suggestions).toEqual([])
    expect(ofRule(scan("students", [studentLine({ gpa: "N/A" })]).issues, "number_invalid")[0].suggestions[0].set).toEqual({ gpa: "" })
  })
  it("wants whole, non-negative credits", () => {
    expect(ofRule(scan("students", [studentLine({ credits_earned: "48.0" })]).issues, "number_invalid")[0].suggestions[0].set).toEqual({ credits_earned: "48" })
    expect(ofRule(scan("students", [studentLine({ credits_earned: "-3" })]).issues, "number_invalid")).toHaveLength(1)
  })
})

describe("D11 credits_outside_class_standing", () => {
  it("warns with the UA range when credits don't fit the class year", () => {
    const [issue] = ofRule(scan("students", [studentLine({ class_year: "Junior", credits_earned: "48" })]).issues, "credits_outside_class_standing")
    expect(issue).toMatchObject({ severity: "warning" })
    expect(issue.message).toContain("60–89")
    expect(ofRule(scan("students", [studentLine({ class_year: "Senior", credits_earned: "95" })]).issues, "credits_outside_class_standing")).toEqual([])
  })
})

describe("D12 email_invalid", () => {
  it("blocks an address that can't receive mail", () => {
    expect(ofRule(scan("students", [studentLine({ email: "maya.patel@" })]).issues, "email_invalid")).toHaveLength(1)
  })
})

describe("D13 email_shared", () => {
  it("warns when another student in the file or database has the address", () => {
    const inFile = scan("students", [studentLine(), studentLine({ student_id: "S2", first_name: "Jo", last_name: "Lee" })]).issues
    expect(ofRule(inFile, "email_shared")).toMatchObject([{ rowIndex: 1, severity: "warning" }])
    const inDb = scan("students", [studentLine({ student_id: "S2", first_name: "Jo", last_name: "Lee" })], existingData([existingStudent()])).issues
    expect(ofRule(inDb, "email_shared")[0].message).toContain("S1 Maya Patel")
  })
})

describe("D14 extra_whitespace", () => {
  it("offers the trimmed value, with apply-to-all", () => {
    const [issue] = ofRule(scan("students", [studentLine({ first_name: " Maya  " })]).issues, "extra_whitespace")
    expect(issue).toMatchObject({ severity: "warning", bulk: true })
    expect(issue.suggestions[0].set).toEqual({ first_name: "Maya" })
  })
  it("ignores double spaces inside note prose", () => {
    expect(ofRule(scan("notes", [noteLine({ note_text: "Met.  Discussed plan." })]).issues, "extra_whitespace")).toEqual([])
  })
})

describe("D15 possible_duplicate_student", () => {
  const grace = studentLine({ student_id: "S1021", first_name: "Grace", last_name: "Okonkwo", email: "grace.okonkwo@example.edu", class_year: "Senior", credits_earned: "98" })
  const gracie = studentLine({ student_id: "S1050", first_name: "Gracie", last_name: "Okonkwo", email: "gracie.okonkwo@example.edu", class_year: "Senior", credits_earned: "96" })

  it("flags the later of two similar students and offers to link them", () => {
    const [issue] = ofRule(scan("students", [grace, gracie]).issues, "possible_duplicate_student")
    expect(issue).toMatchObject({ rowIndex: 1, severity: "warning" })
    expect(issue.suggestions[0].set).toEqual({ possible_duplicate_of: "S1021" })
  })
  it("goes quiet once linked", () => {
    const { rows, ctx } = scan("students", [grace, gracie])
    const linked = setValue(rows, 1, "possible_duplicate_of", "S1021")
    expect(ofRule(validateRows("students", linked, ctx), "possible_duplicate_student")).toEqual([])
  })
  it("stays quiet on re-import when an earlier import already linked the pair", () => {
    const stored = [
      existingStudent({ student_id: "S1021", first_name: "Grace", last_name: "Okonkwo", email: "grace.okonkwo@example.edu", class_year: "Senior", credits_earned: 98 }),
      existingStudent({ student_id: "S1050", first_name: "Gracie", last_name: "Okonkwo", email: "gracie.okonkwo@example.edu", class_year: "Senior", credits_earned: 96, possible_duplicate_of: "S1021" }),
    ]
    expect(ofRule(scan("students", [grace, gracie], existingData(stored)).issues, "possible_duplicate_student")).toEqual([])
  })
  it("ignores different surnames", () => {
    const other = studentLine({ student_id: "S2", first_name: "Gracie", last_name: "Adams", email: "g.adams@example.edu" })
    expect(ofRule(scan("students", [grace, other]).issues, "possible_duplicate_student")).toEqual([])
  })
})

describe("D16 unknown_student", () => {
  it("blocks a note for a student not in the database", () => {
    const [issue] = ofRule(scan("notes", [noteLine({ student_id: "S9" })]).issues, "unknown_student")
    expect(issue).toMatchObject({ severity: "error", suggestions: [] })
  })
  it("suggests the stored ID when only case differs", () => {
    const [issue] = ofRule(scan("notes", [noteLine({ student_id: "s1" })]).issues, "unknown_student")
    expect(issue.suggestions[0].set).toEqual({ student_id: "S1" })
  })
})

describe("D17 ssn_in_text", () => {
  it("blocks, never shows the number, and offers to remove it", () => {
    const [issue] = ofRule(scan("notes", [noteLine({ note_text: "She gave her SSN 000-12-3456 for the form." })]).issues, "ssn_in_text")
    expect(issue.severity).toBe("error")
    expect(issue.value).not.toMatch(/\d{3}-\d{2}-\d{4}/)
    expect(issue.suggestions[0].set?.note_text).toBe("She gave her SSN [SSN removed] for the form.")
  })
  it("leaves phone numbers alone", () => {
    expect(ofRule(scan("notes", [noteLine({ note_text: "Best reached at 520-555-0100." })]).issues, "ssn_in_text")).toEqual([])
  })
})

describe("D18 sensitive_content", () => {
  const text = "Shared she has been seeing a campus counselor for anxiety; asked that this stay private."
  it("blocks until someone decides, offering both choices", () => {
    const [issue] = ofRule(scan("notes", [noteLine({ note_text: text })]).issues, "sensitive_content")
    expect(issue.message).toMatch(/mental health/)
    expect(issue.suggestions.map((s) => s.set?.is_sensitive)).toEqual(["yes", "no"])
  })
  it("is satisfied by either decision", () => {
    const { rows, ctx } = scan("notes", [noteLine({ note_text: text })])
    expect(ofRule(validateRows("notes", setValue(rows, 0, "is_sensitive", "no"), ctx), "sensitive_content")).toEqual([])
  })
})

describe("D19 contact_preference_in_text", () => {
  const d19 = (lines: string[], existing?: Parameters<typeof scan>[2]) => ofRule(scan("notes", lines, existing).issues, "contact_preference_in_text")

  it("offers to save it as the student's contact preference, never as the contact type", () => {
    const [issue] = d19([noteLine({ note_text: "Asked that we contact him by phone only; email goes to a shared family account." })])
    expect(issue.severity).toBe("warning")
    expect(issue.suggestions).toEqual([{ label: "Save as S1's contact preference (Phone only)", set: { contact_preference: "yes" } }])
  })

  it("tells a restriction, a preference and other guidance apart", () => {
    expect(extractContactPreference("Asked that we contact him by phone only.")).toMatchObject({ channel: "Phone", only: true })
    expect(extractContactPreference("Student prefers email from now on.")).toMatchObject({ channel: "Email", only: false })
    expect(extractContactPreference("Best reached after 5 pm.")).toMatchObject({ channel: null, only: false })
    expect(extractContactPreference("Please do not call; texts are fine.")).toMatchObject({ channel: null })
  })

  it("doesn't read how a contact happened as a preference", () => {
    expect(d19([noteLine({ note_text: "Contacted student by email to discuss registration." })])).toEqual([])
    expect(extractContactPreference("Called the student by phone about the hold.")).toBeNull()
  })

  it("can save only the newest statement for a student in the file", () => {
    const issues = d19([
      noteLine({ note_id: "N1", contact_date: "2026-09-01", note_text: "Prefers phone." }),
      noteLine({ note_id: "N2", contact_date: "2026-09-20", note_text: "Student prefers email now." }),
    ])
    expect(issues.map((i) => [i.rowIndex, i.severity, i.suggestions.length])).toEqual([
      [0, "info", 0],
      [1, "warning", 1],
    ])
    expect(issues[0].message).toMatch(/Row 3 \(N2\) states a newer one/)
  })

  it("never replaces a newer preference already on the record", () => {
    const onFile = existingData([existingStudent({ preference: { heading: "Email only", stated_on: "2026-10-04" } })])
    const [issue] = d19([noteLine({ contact_date: "2026-09-01", note_text: "Prefers phone." })], onFile)
    expect(issue).toMatchObject({ severity: "info", suggestions: [] })
    expect(issue.message).toMatch(/already has a newer one \(Email only, from Oct 4, 2026\), which is kept/)
  })

  it("says when saving would replace an older preference", () => {
    const onFile = existingData([existingStudent({ preference: { heading: "Phone only", stated_on: "2026-01-22" } })])
    const [issue] = d19([noteLine({ note_text: "Student prefers email now." })], onFile)
    expect(issue.message).toMatch(/replaces the one on file \(Phone only, from Jan 22, 2026\)/)
  })

  it("never shows an SSN in its message", () => {
    const [issue] = d19([noteLine({ note_text: "Phone only. SSN 123-45-6789 on file." })])
    expect(issue.message).not.toMatch(/123-45-6789/)
  })

  it("saves what the final text says, after the SSN is removed", () => {
    const { rows, ctx } = scan("notes", [noteLine({ note_text: "Prefers phone only, SSN 123-45-6789." })])
    let reviewed = setValue(rows, 0, "contact_preference", "yes")
    reviewed = setValue(reviewed, 0, "note_text", "Prefers phone only, SSN [SSN removed].")
    const plan = buildCommitPlan("notes", reviewed, validateRows("notes", reviewed, ctx), ctx)
    expect(plan.preferences).toEqual([
      {
        student_id: "S1",
        preference: { channel: "Phone", only: true, details: "Prefers phone only, SSN [SSN removed].", stated_on: "2026-09-18", source_note_id: "N1" },
      },
    ])
    expect(JSON.stringify(plan)).not.toMatch(/123-45-6789/)
  })
})

describe("D20 follow_up_date_in_text", () => {
  const suggested = (note_text: string, contact_date: string) =>
    ofRule(scan("notes", [noteLine({ note_text, contact_date })]).issues, "follow_up_date_in_text")[0]?.suggestions[0].set?.follow_up_date

  it("turns an explicit date into a follow-up date", () => {
    expect(suggested("Follow up on missing FAFSA verification by Oct 15.", "2026-09-11")).toBe("2026-10-15")
    expect(suggested("Check back by Jan 15.", "2025-12-10")).toBe("2026-01-15")
  })
  it("ignores past events and vague phrases", () => {
    expect(suggested("Met on Sep 3 to plan.", "2026-09-18")).toBeUndefined()
    expect(suggested("Portfolio review mid-October.", "2026-09-03")).toBeUndefined()
  })
})

describe("D21 duplicate_note_in_file", () => {
  it("flags the same note under two IDs", () => {
    const [issue] = ofRule(scan("notes", [noteLine(), noteLine({ note_id: "N2" })]).issues, "duplicate_note_in_file")
    expect(issue).toMatchObject({ rowIndex: 1, severity: "warning" })
    expect(issue.suggestions[0]).toMatchObject({ exclude: true })
  })
})

describe("D22 last_contact_mismatch", () => {
  it("notes when the spreadsheet date and newest note disagree, and which date the app uses", () => {
    const existing = existingData([existingStudent({ source_last_contact_date: "2026-06-02" })])
    const [issue] = ofRule(scan("notes", [noteLine({ contact_date: "2026-06-10" })], existing).issues, "last_contact_mismatch")
    expect(issue.severity).toBe("info")
    expect(issue.message).toContain("uses the later date, Jun 10, 2026")
  })
  it("is quiet when they agree", () => {
    const existing = existingData([existingStudent({ source_last_contact_date: "2026-09-18" })])
    expect(ofRule(scan("notes", [noteLine()], existing).issues, "last_contact_mismatch")).toEqual([])
  })
  it("also checks a students file against notes already stored", () => {
    const existing = existingData([existingStudent({ newest_note_date: "2026-09-01" })])
    expect(ofRule(scan("students", [studentLine({ last_contact_date: "2026-08-01" })], existing).issues, "last_contact_mismatch")).toHaveLength(1)
  })
})

describe("D23 note_advisor_differs", () => {
  it("is informational", () => {
    const [issue] = ofRule(scan("notes", [noteLine({ advisor: "Reyes" })]).issues, "note_advisor_differs")
    expect(issue).toMatchObject({ severity: "info" })
  })
})

describe("rule catalog", () => {
  it("has one rule per decision D1–D23, in order", () => {
    expect(RULES.map((r) => r.decision)).toEqual(Array.from({ length: 23 }, (_, i) => `D${i + 1}`))
    expect(new Set(RULES.map((r) => r.name)).size).toBe(RULES.length)
  })

  it("matches docs/DECISIONS.md: each entry names its rule", () => {
    const doc = readFileSync("docs/DECISIONS.md", "utf8")
    for (const rule of RULES) expect(doc).toContain(`**${rule.decision} · \`${rule.name}\``)
  })
})
