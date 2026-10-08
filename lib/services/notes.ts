import { TODAY_ISO } from "@/lib/config"
import type { Db } from "@/lib/db/client"
import type { ContactNote, NewNoteInput, Student } from "@/lib/types"
import { validateNoteInput } from "@/lib/validation"
import { NotFoundError, ValidationError } from "./errors"
import { getStudent, toContactNote } from "./students"

/** Next ID in the dataset's own pattern (N001…N057 → N058). */
async function nextNoteId(db: Db): Promise<string> {
  const ids = await db.selectFrom("contact_notes").select("note_id").execute()
  const highest = ids.reduce((max, { note_id }) => {
    const m = /^N(\d+)$/.exec(note_id)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
  return `N${String(highest + 1).padStart(3, "0")}`
}

/**
 * Logs a contact. The same rules as the form, re-checked here because the API is the authority:
 * no future dates, no SSNs, a known contact type. Returns the note and the student's recomputed
 * score, so the caller can show the effect straight away.
 */
export async function createNote(
  db: Db,
  studentId: string,
  input: NewNoteInput,
  today = TODAY_ISO,
): Promise<{ note: ContactNote; student: Student }> {
  const exists = await db.selectFrom("students").select("student_id").where("student_id", "=", studentId).executeTakeFirst()
  if (!exists) throw new NotFoundError(`No student with ID ${studentId}.`)

  const errors = validateNoteInput(input, today)
  if (Object.keys(errors).length > 0) throw new ValidationError("The note couldn't be saved. Check the highlighted fields.", errors)

  // Two advisors saving at once could pick the same next ID; the primary key rejects the second, which retries.
  for (let attempt = 0; attempt < 3; attempt++) {
    const note_id = await nextNoteId(db)
    try {
      await db
        .insertInto("contact_notes")
        .values({
          note_id,
          student_id: studentId,
          contact_date: input.contact_date,
          contact_type: input.contact_type,
          advisor: input.advisor.trim(),
          note_text: input.note_text.trim(),
          follow_up_date: input.follow_up_date || null,
          is_sensitive: input.is_sensitive ? 1 : 0,
          source: "app",
          import_id: null,
          created_at: new Date().toISOString(),
        })
        .execute()
      const row = await db.selectFrom("contact_notes").selectAll().where("note_id", "=", note_id).executeTakeFirstOrThrow()
      const student = await getStudent(db, studentId, today)
      return { note: toContactNote(row), student: student! }
    } catch (error) {
      if (attempt === 2 || !/unique|duplicate|primary key/i.test(String(error))) throw error
    }
  }
  throw new Error("Couldn't allocate a note ID.")
}
