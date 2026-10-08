import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createDb, resolveDbConfig, type Db } from "@/lib/db/client"
import { migrateToLatest } from "@/lib/db/setup"
import { compareOutreach, scoreStudent } from "@/lib/scoring"
import { importAcceptingAll, readSampleFile, seedSampleData } from "@/lib/services/seed"
import type { CommitResult } from "@/lib/services/import-service"

/*
 * The hiring team's files, imported end to end with every recommended fix accepted. Runs on SQLite
 * in memory always, and on Postgres too when TEST_DATABASE_URL is set (e.g. Postgres in Docker).
 */

const TODAY = "2026-10-05"
const targets = [
  { name: "SQLite", url: ":memory:" },
  ...(process.env.TEST_DATABASE_URL ? [{ name: "Postgres", url: process.env.TEST_DATABASE_URL }] : []),
]

async function dropEverything(db: Db) {
  for (const table of ["import_issues", "contact_notes", "students", "imports", "app_meta", "kysely_migration", "kysely_migration_lock"]) {
    await db.schema.dropTable(table).ifExists().execute()
  }
}

describe.each(targets)("sample data import on $name", ({ url }) => {
  let db: Db
  let result: Record<"students" | "notes", CommitResult>

  beforeAll(async () => {
    db = createDb(resolveDbConfig(url))
    await dropEverything(db)
    await migrateToLatest(db)
    result = await seedSampleData(db, TODAY)
  }, 60_000)

  afterAll(async () => {
    await db?.destroy()
  })

  it("imports every row, excluding none", () => {
    expect(result.students).toMatchObject({ added: 50, excluded: 0 })
    expect(result.notes).toMatchObject({ added: 57, excluded: 0 })
  })

  it("records exactly the fixes the audit predicted", () => {
    expect(result.students.fixesByRule).toEqual({ date_not_iso: 8, date_placeholder: 1, possible_duplicate_student: 1 })
    expect(result.notes.fixesByRule).toEqual({
      date_not_iso: 11,
      ssn_in_text: 1,
      sensitive_content: 1,
      contact_preference_in_text: 1,
      follow_up_date_in_text: 1,
    })
  })

  it("applies the decisions to the right records", async () => {
    const n041 = await db.selectFrom("contact_notes").selectAll().where("note_id", "=", "N041").executeTakeFirstOrThrow()
    expect(n041).toMatchObject({ is_sensitive: 1, follow_up_date: "2026-10-15" })
    expect(n041.note_text).toContain("[SSN removed]")

    const student = (id: string) => db.selectFrom("students").selectAll().where("student_id", "=", id).executeTakeFirstOrThrow()
    expect(JSON.parse((await student("S1002")).contact_preference!)).toMatchObject({ channel: "Phone", note_id: "N001" })
    expect((await student("S1050")).possible_duplicate_of).toBe("S1021")
    expect((await student("S1040")).source_last_contact_date).toBeNull()
    expect((await student("S1003")).source_last_contact_date).toBe("2026-08-25")
  })

  it("never stores an SSN-shaped number, anywhere", async () => {
    const ssn = /\b\d{3}-\d{2}-\d{4}\b/
    const tables = ["students", "contact_notes", "imports", "import_issues"] as const
    for (const table of tables) {
      const rows = await db.selectFrom(table).selectAll().execute()
      for (const row of rows) for (const v of Object.values(row)) if (typeof v === "string") expect(v).not.toMatch(ssn)
    }
  })

  it("records the source files' fingerprints", async () => {
    // Same hashes as docs/DATA_AUDIT.md: the import read the files byte-for-byte.
    const imports = await db.selectFrom("imports").select(["kind", "source_sha256"]).execute()
    expect(Object.fromEntries(imports.map((i) => [i.kind, i.source_sha256]))).toEqual({
      students: "c9a181e31779ab69eac98e7182c8fa2c85a2ee8328c0c57a7cd0c6fee1608669",
      notes: "6cfea8fcd3b0766c65910721fa6775b62304f02aefb9b772fad8edca3992eed0",
    })
  })

  it("ranks the outreach queue as worked out by hand", async () => {
    const students = await db.selectFrom("students").selectAll().execute()
    const notes = await db.selectFrom("contact_notes").selectAll().execute()
    const queue = students
      .map((s) => ({
        id: s.student_id,
        sortName: `${s.last_name}, ${s.first_name}`,
        outreach: scoreStudent(
          { ...s, gpa: s.gpa === null ? null : Number(s.gpa), credits_earned: Number(s.credits_earned) },
          notes.filter((n) => n.student_id === s.student_id),
          TODAY,
        ),
      }))
      .sort(compareOutreach)

    // No contact on record first (D24): S1018 is High risk with GPA 2.10 (40+30+10); S1006 and S1040 tie at 55, by name.
    expect(queue.slice(0, 3).map((q) => [q.id, q.outreach.score])).toEqual([
      ["S1018", 80],
      ["S1006", 55],
      ["S1040", 55],
    ])
    // S1002: 125 days (35) + High (30) + GPA 2.15 (10) + waiting on a reply since Jun 2 (15).
    const s1002 = queue.find((q) => q.id === "S1002")!
    expect(s1002.outreach.score).toBe(90)
    expect(s1002.outreach.reasons.map((r) => r.rule)).toEqual(["days_since_contact", "risk_flag", "gpa", "waiting_on_student"])
    // Waiting on the student (D25): four students, all High risk. S1016's "appeal pending" doesn't count.
    const waiting = queue.filter((q) => q.outreach.reasons.some((r) => r.rule === "waiting_on_student")).map((q) => q.id)
    expect(waiting.sort()).toEqual(["S1002", "S1014", "S1030", "S1044"])
  })

  it("skips every note when the same file is imported again", async () => {
    const again = await importAcceptingAll(db, "notes", readSampleFile("notes"), TODAY)
    expect(again).toMatchObject({ added: 0, unchanged: 57, excluded: 0 })
    const count = await db.selectFrom("contact_notes").select((eb) => eb.fn.countAll().as("n")).executeTakeFirstOrThrow()
    expect(Number(count.n)).toBe(57)
  })
})
