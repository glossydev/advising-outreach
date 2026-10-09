import { describe, expect, it } from "vitest"
import { buildFixHistory } from "@/lib/import/history"
import { buildCommitPlan } from "@/lib/import/plan"
import { acceptAllSuggestions, applySuggestion, applyToAllLike, setExcluded, setValue } from "@/lib/import/resolve"
import { blockingIssues, needsAttention, validateRows } from "@/lib/import/validate"
import { existingData, existingStudent, noteLine, ofRule, scan, studentLine } from "../helpers"

describe("applying fixes", () => {
  it("apply-to-all converts every non-ISO date in one step", () => {
    const { rows, ctx, issues } = scan("students", [
      studentLine({ last_contact_date: "Aug 25, 2026" }),
      studentLine({ student_id: "S2", first_name: "Jo", last_name: "Lee", email: "jo.lee@example.edu", last_contact_date: "30-Aug-2026" }),
    ])
    const fixed = applyToAllLike(rows, issues, ofRule(issues, "date_not_iso")[0])
    expect(fixed.map((r) => r.values.last_contact_date)).toEqual(["2026-08-25", "2026-08-30"])
    expect(ofRule(validateRows("students", fixed, ctx), "date_not_iso")).toEqual([])
  })

  it("accept-all (the seed's policy) leaves nothing needing attention", () => {
    const { rows, ctx } = scan("students", [
      studentLine({ last_contact_date: "N/A", risk_flag: "low" }),
      studentLine({ student_id: "S2", first_name: "Jo", last_name: "Lee", email: "jo.lee@example.edu", risk_flag: "Severe" }),
    ])
    const after = acceptAllSuggestions("students", rows, ctx)
    expect(validateRows("students", after, ctx).filter((i) => needsAttention(i, after))).toEqual([])
    expect(after[0].values).toMatchObject({ last_contact_date: "", risk_flag: "Low" })
    // No suggestion for "Severe", so the row is excluded rather than guessed at.
    expect(after[1].excluded).toBe(true)
  })
})

describe("commit plan", () => {
  it("reports blocking issues and refuses nothing silently", () => {
    const { rows, ctx, issues } = scan("students", [studentLine({ risk_flag: "Severe" })])
    expect(buildCommitPlan("students", rows, issues, ctx).blocking).toHaveLength(1)
    const excluded = setExcluded(rows, 0, true)
    const plan = buildCommitPlan("students", excluded, validateRows("students", excluded, ctx), ctx)
    expect(plan.blocking).toEqual([])
    expect(plan.excludedRows).toEqual([0])
  })

  it("adds new students, updates changed ones, leaves identical ones alone", () => {
    const existing = existingData([existingStudent(), existingStudent({ student_id: "S2", first_name: "Jo", last_name: "Lee", email: "jo.lee@example.edu" })])
    const { rows, ctx, issues } = scan(
      "students",
      [
        studentLine(),
        studentLine({ student_id: "S2", first_name: "Jo", last_name: "Lee", email: "jo.lee@example.edu", major: "Chemistry" }),
        studentLine({ student_id: "S3", first_name: "Ana", last_name: "Ruiz", email: "ana.ruiz@example.edu" }),
      ],
      existing,
    )
    const plan = buildCommitPlan("students", rows, issues, ctx)
    expect(plan.unchanged).toEqual(["S1"])
    expect(plan.studentUpdates.map((u) => u.write.student_id)).toEqual(["S2"])
    expect(plan.studentInserts.map((s) => s.student_id)).toEqual(["S3"])
  })

  it("carries note decisions into the writes", () => {
    const { rows, ctx } = scan("notes", [noteLine({ note_text: "Asked that we contact him by phone only. Follow up by Oct 15." })])
    const after = acceptAllSuggestions("notes", rows, ctx)
    const plan = buildCommitPlan("notes", after, validateRows("notes", after, ctx), ctx)
    expect(plan.noteInserts[0]).toMatchObject({ follow_up_date: "2026-10-15", is_sensitive: false })
    expect(plan.preferences[0]).toMatchObject({ student_id: "S1", preference: { channel: "Phone", only: true, source_note_id: "N1" } })
    // The preference goes on the student; the note keeps its own contact type.
    expect(plan.noteInserts[0].contact_type).toBe("In person")
  })
})

describe("fix history", () => {
  it("records each fix, who decided, and never keeps an SSN", () => {
    const { rows, ctx, issues } = scan("notes", [
      noteLine({ note_text: "Gave her SSN 000-12-3456 for the form.", contact_date: "Sep 11, 2026" }),
      noteLine({ note_id: "N2", contact_date: "2026-09-01", note_text: "Checked in." }),
    ])
    let after = acceptAllSuggestions("notes", rows, ctx)
    after = setValue(after, 1, "advisor", "Reyes") // an edit no rule asked for
    const history = buildFixHistory("notes", rows, issues, after, validateRows("notes", after, ctx))

    const byRule = (rule: string) => history.find((h) => h.rule === rule)
    expect(byRule("date_not_iso")).toMatchObject({ originalValue: "Sep 11, 2026", finalValue: "2026-09-11", resolution: "accepted_suggestion" })
    expect(byRule("sensitive_content")).toMatchObject({ field: "is_sensitive", finalValue: "yes", resolution: "accepted_suggestion" })
    expect(byRule("manual_edit")).toMatchObject({ field: "advisor", originalValue: "Okafor", finalValue: "Reyes", resolution: "edited" })
    const ssn = byRule("ssn_in_text")!
    expect(ssn.resolution).toBe("accepted_suggestion")
    for (const record of history) {
      expect(`${record.originalValue} ${record.finalValue} ${record.message}`).not.toMatch(/\d{3}-\d{2}-\d{4}/)
    }
  })

  it("records warnings kept as they are", () => {
    const { rows, ctx, issues } = scan("students", [studentLine({ class_year: "Junior", credits_earned: "48" })])
    const warning = ofRule(issues, "credits_outside_class_standing")[0]
    const kept = rows.map((r) => ({ ...r, acknowledged: [warning.key] }))
    expect(blockingIssues(validateRows("students", kept, ctx), kept)).toEqual([])
    const history = buildFixHistory("students", rows, issues, kept, validateRows("students", kept, ctx))
    expect(history).toEqual([expect.objectContaining({ rule: "credits_outside_class_standing", resolution: "kept_as_is" })])
  })

  it("records excluded rows", () => {
    const { rows, ctx, issues } = scan("students", [studentLine({ risk_flag: "Severe" })])
    const after = applySuggestion(rows, ofRule(issues, "value_not_in_list")[0], { label: "Exclude", exclude: true })
    const history = buildFixHistory("students", rows, issues, after, validateRows("students", after, ctx))
    expect(history[0]).toMatchObject({ rule: "value_not_in_list", resolution: "excluded_row", finalValue: null })
  })
})
