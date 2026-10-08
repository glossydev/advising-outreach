import { describe, expect, it } from "vitest"
import { matchColumns, missingRequired, unusedHeaders } from "@/lib/import/columns"
import { NOTE_FIELDS, STUDENT_FIELDS } from "@/lib/import/fields"
import { NOTE_HEADER, STUDENT_HEADER } from "../helpers"

const kindOf = (matches: ReturnType<typeof matchColumns>, field: string) => matches.find((m) => m.field === field)

describe("matchColumns (DECISIONS P2)", () => {
  it("matches the sample files' headers exactly", () => {
    expect(matchColumns(STUDENT_HEADER.split(","), STUDENT_FIELDS).every((m) => m.kind === "exact")).toBe(true)
    expect(matchColumns(NOTE_HEADER.split(","), NOTE_FIELDS).every((m) => m.kind === "exact")).toBe(true)
  })

  it("labels each weaker match so the review screen can highlight it", () => {
    const headers = ["Student ID", "First Name", "Surname", "Email", "Program", "Class Standing", "credits", "GPA", "Advisor", "Last Contacted", "Risk", "Notes"]
    const matches = matchColumns(headers, STUDENT_FIELDS)
    expect(kindOf(matches, "student_id")).toMatchObject({ header: "Student ID", kind: "formatting" })
    expect(kindOf(matches, "last_name")).toMatchObject({ header: "Surname", kind: "alias" })
    expect(kindOf(matches, "credits_earned")).toMatchObject({ header: "credits", kind: "alias" })
    expect(kindOf(matches, "risk_flag")).toMatchObject({ header: "Risk", kind: "alias" })
    expect(unusedHeaders(headers, matches)).toEqual(["Notes"])
  })

  it("guesses at misspellings, but only when close", () => {
    const matches = matchColumns(["studnet_id", "zzz"], STUDENT_FIELDS)
    expect(kindOf(matches, "student_id")).toMatchObject({ header: "studnet_id", kind: "guess" })
    expect(matches.filter((m) => m.header === "zzz")).toHaveLength(0)
  })

  it("uses each CSV column at most once", () => {
    const matches = matchColumns(["id", "id"], NOTE_FIELDS)
    const used = matches.filter((m) => m.column !== null).map((m) => m.column)
    expect(new Set(used).size).toBe(used.length)
  })

  it("lists required fields left unmatched", () => {
    const matches = matchColumns(["student_id", "first_name"], STUDENT_FIELDS)
    expect(missingRequired("students", matches)).toEqual(
      expect.arrayContaining(["last_name", "email", "major", "class_year", "credits_earned", "advisor", "risk_flag"]),
    )
    expect(missingRequired("students", matches)).not.toContain("gpa")
  })
})
