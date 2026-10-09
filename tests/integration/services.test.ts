import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, type Db } from "@/lib/db/client"
import { migrateToLatest } from "@/lib/db/setup"
import { getDataQualityReport } from "@/lib/services/data-quality"
import { ValidationError } from "@/lib/services/errors"
import { scanImport } from "@/lib/services/import-scan"
import { createNote } from "@/lib/services/notes"
import { reloadSampleData, resetDatabase } from "@/lib/services/prototype"
import { readSampleFile, seedSampleData } from "@/lib/services/seed"
import {
  getOutreachQueue,
  getOutreachStats,
  getStudent,
  getStudentDataNotes,
  listNotes,
  listStudents,
} from "@/lib/services/students"

/* The service layer the pages and API share, on the seeded sample data (SQLite in memory). */

const TODAY = "2026-10-05"
let db: Db

beforeAll(async () => {
  db = createDb({ dialect: "sqlite", file: ":memory:" })
  await migrateToLatest(db)
  await seedSampleData(db, TODAY)
})

afterAll(async () => {
  await db.destroy()
})

const note = (overrides: Partial<Parameters<typeof createNote>[2]> = {}) => ({
  contact_date: TODAY,
  contact_type: "Phone",
  advisor: "Reyes",
  note_text: "Called; discussed tutoring schedule.",
  follow_up_date: null,
  is_sensitive: false,
  ...overrides,
})

describe("students", () => {
  it("searches, filters and sorts the directory", async () => {
    expect((await listStudents(db, { q: "okonkwo" }, TODAY)).map((s) => s.student_id)).toEqual(["S1021", "S1050"])
    expect((await listStudents(db, { last_contact: "none" }, TODAY)).map((s) => s.student_id).sort()).toEqual(["S1006", "S1018", "S1040"])
    const high = await listStudents(db, { risks: ["High"], advisor: "Reyes", sort: "score", dir: "desc" }, TODAY)
    expect(high.every((s) => s.risk_flag === "High" && s.advisor === "Reyes")).toBe(true)
    expect(high.map((s) => s.outreach_score)).toEqual([...high.map((s) => s.outreach_score)].sort((a, b) => b - a))
  })

  it("links possible duplicates in both directions (D15)", async () => {
    expect((await getStudent(db, "S1021", TODAY))?.possible_duplicates).toEqual([{ student_id: "S1050", name: "Gracie Okonkwo" }])
    expect((await getStudent(db, "S1050", TODAY))?.possible_duplicates).toEqual([{ student_id: "S1021", name: "Grace Okonkwo" }])
  })

  it("carries the saved contact preference (D19)", async () => {
    expect((await getStudent(db, "S1002", TODAY))?.contact_preference).toMatchObject({ channel: "Phone", note_id: "N001" })
  })

  it("explains what the import did to a student's data", async () => {
    const notes = await getStudentDataNotes(db, "S1003")
    expect(notes.map((n) => n.message)).toEqual(
      expect.arrayContaining([
        'Last contact date: "Aug 25, 2026" → "2026-08-25"',
        'Note N030, Contact date: "Aug 25, 2026" → "2026-08-25"',
      ]),
    )
  })

  it("summarizes the queue for an advisor", async () => {
    const stats = await getOutreachStats(db, "Okafor", TODAY)
    expect(stats.assigned).toBe(17)
    const queue = await getOutreachQueue(db, { advisor: "Okafor", limit: 3 }, TODAY)
    expect(queue).toHaveLength(3)
    expect(queue.every((s) => s.advisor === "Okafor")).toBe(true)
  })
})

describe("logging a contact", () => {
  it("rejects an SSN and a future date, with field messages", async () => {
    const attempt = createNote(db, "S1002", note({ note_text: "SSN 123-45-6789", contact_date: "2026-10-06" }), TODAY)
    await expect(attempt).rejects.toBeInstanceOf(ValidationError)
    const error = (await attempt.catch((e: unknown) => e)) as ValidationError
    expect(Object.keys(error.fields).sort()).toEqual(["contact_date", "note_text"])
  })

  it("saves the note with the next ID and returns the recomputed score", async () => {
    const before = (await getStudent(db, "S1002", TODAY))!
    expect(before.outreach_reasons.map((r) => r.rule)).toContain("waiting_on_student")

    const { note: saved, student } = await createNote(db, "S1002", note(), TODAY)
    expect(saved).toMatchObject({ note_id: "N058", source: "app", contact_type: "Phone" })
    expect(student.last_contact_date).toBe(TODAY)
    expect(student.outreach_score).toBeLessThan(before.outreach_score)
    expect(student.outreach_reasons.map((r) => r.rule)).not.toContain("waiting_on_student")
    expect((await listNotes(db, "S1002"))[0].note_id).toBe("N058")
  })
})

describe("data quality and imports", () => {
  it("reports both seed imports and what the rules found", async () => {
    const report = await getDataQualityReport(db)
    expect(report.imports.map((i) => i.kind).sort()).toEqual(["notes", "students"])
    expect(report.rules.find((r) => r.rule === "date_not_iso")?.count).toBe(19)
    expect(report.totals.fixes_accepted).toBe(25)
  })

  it("scans the sample notes against the database without writing", async () => {
    const scan = await scanImport(db, "notes", readSampleFile("notes"), undefined, TODAY)
    expect(scan.missingRequired).toEqual([])
    expect(scan.issues.filter((i) => i.rule === "id_already_imported")).toHaveLength(57)
    expect(scan.issues.find((i) => i.rule === "ssn_in_text")?.value).not.toMatch(/\d{3}-\d{2}-\d{4}/)
  })

  it("empties the database on reset, and reloads the sample data on request", async () => {
    await resetDatabase(db)
    expect(await listStudents(db, {}, TODAY)).toEqual([])
    expect(await reloadSampleData(db)).toEqual({ students: 50, notes: 57 })
    expect((await getStudent(db, "S1037", TODAY))?.student_id).toBe("S1037")
  })
})
