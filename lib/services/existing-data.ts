import { parsePreference, preferenceHeading } from "@/lib/contact-preference"
import type { Db } from "@/lib/db/client"
import type { ExistingData, ExistingNote, ExistingStudent } from "@/lib/import/types"

/** Snapshot of what's in the database, for the import rules to compare a file against. */
export async function loadExistingData(db: Db): Promise<ExistingData> {
  const students = await db
    .selectFrom("students")
    .select([
      "student_id",
      "first_name",
      "last_name",
      "email",
      "major",
      "class_year",
      "credits_earned",
      "gpa",
      "advisor",
      "risk_flag",
      "source_last_contact_date",
      "possible_duplicate_of",
      "contact_preference",
    ])
    .execute()
  const notes = await db
    .selectFrom("contact_notes")
    .select(["note_id", "student_id", "contact_date", "contact_type", "advisor", "note_text"])
    .execute()

  const newest = new Map<string, string>()
  for (const n of notes) {
    const current = newest.get(n.student_id)
    if (!current || n.contact_date > current) newest.set(n.student_id, n.contact_date)
  }

  return {
    students: new Map<string, ExistingStudent>(
      students.map(({ contact_preference, ...s }) => {
        const preference = parsePreference(contact_preference)
        return [
          s.student_id,
          {
            ...s,
            credits_earned: Number(s.credits_earned),
            gpa: s.gpa === null ? null : Number(s.gpa),
            newest_note_date: newest.get(s.student_id) ?? null,
            // Only what the rules need: the details stay on the server.
            preference: preference ? { heading: preferenceHeading(preference), stated_on: preference.stated_on } : null,
          },
        ]
      }),
    ),
    notes: new Map<string, ExistingNote>(notes.map((n) => [n.note_id, n])),
  }
}
