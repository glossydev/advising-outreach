import { TODAY_ISO } from "@/lib/config"
import { validatePreferenceInput } from "@/lib/contact-preference"
import type { Db } from "@/lib/db/client"
import type { ContactPreference, ContactPreferenceInput, Student } from "@/lib/types"
import { NotFoundError, ValidationError } from "./errors"
import { getStudent } from "./students"

async function requireStudent(db: Db, studentId: string) {
  const row = await db.selectFrom("students").select("student_id").where("student_id", "=", studentId).executeTakeFirst()
  if (!row) throw new NotFoundError(`No student with ID ${studentId}.`)
}

/**
 * Sets a student's contact preference from the editor on their page (P9). It's dated today and
 * has no source note. The same checks as the editor, re-run here: a known channel, no SSN, and
 * something to save.
 */
export async function setContactPreference(
  db: Db,
  studentId: string,
  input: ContactPreferenceInput,
  today = TODAY_ISO,
): Promise<Student> {
  await requireStudent(db, studentId)
  const errors = validatePreferenceInput(input)
  if (Object.keys(errors).length > 0) throw new ValidationError("The contact preference couldn't be saved. Check the highlighted fields.", errors)
  const preference: ContactPreference = {
    channel: input.channel,
    only: input.channel ? input.only : false,
    details: input.details.trim(),
    stated_on: today,
    source_note_id: null,
  }
  await db
    .updateTable("students")
    .set({ contact_preference: JSON.stringify(preference), updated_at: new Date().toISOString() })
    .where("student_id", "=", studentId)
    .execute()
  return (await getStudent(db, studentId, today))!
}

/** Removes a student's contact preference. The note it came from, if any, stays in the timeline. */
export async function clearContactPreference(db: Db, studentId: string, today = TODAY_ISO): Promise<Student> {
  await requireStudent(db, studentId)
  await db
    .updateTable("students")
    .set({ contact_preference: null, updated_at: new Date().toISOString() })
    .where("student_id", "=", studentId)
    .execute()
  return (await getStudent(db, studentId, today))!
}
