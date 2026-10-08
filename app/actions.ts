"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ADVISOR_COOKIE, ALL_ADVISORS } from "@/lib/config"
import { addNote, getAdvisors, importFromCsv, resetToSeed } from "@/lib/data"
import type { NewNoteInput, NoteFieldErrors } from "@/lib/types"

export async function setAdvisorAction(advisor: string) {
  const advisors = await getAdvisors()
  const value = advisors.includes(advisor) ? advisor : ALL_ADVISORS
  ;(await cookies()).set(ADVISOR_COOKIE, value, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 180 })
  revalidatePath("/", "layout")
}

export async function logContactAction(
  input: NewNoteInput,
): Promise<{ ok: true } | { ok: false; errors: NoteFieldErrors }> {
  const result = await addNote(input)
  if (!result.ok) return result
  revalidatePath("/", "layout")
  return { ok: true }
}

export type ImportActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }

export async function runImportAction(_prev: ImportActionState, formData: FormData): Promise<ImportActionState> {
  const studentsFile = formData.get("students")
  const notesFile = formData.get("notes")
  const hasStudents = studentsFile instanceof File && studentsFile.size > 0
  const hasNotes = notesFile instanceof File && notesFile.size > 0

  try {
    if (!hasStudents && !hasNotes) {
      const report = await resetToSeed()
      revalidatePath("/", "layout")
      return { status: "success", message: `Re-seeded sample data: ${report.summary.issue_count} issues found.` }
    }
    if (!hasStudents) return { status: "error", message: "Add students.csv to run an import." }
    if (studentsFile.size > 5_000_000 || (hasNotes && notesFile.size > 5_000_000)) {
      return { status: "error", message: "Files must be under 5 MB." }
    }
    const report = await importFromCsv(await studentsFile.text(), hasNotes ? await notesFile.text() : "")
    revalidatePath("/", "layout")
    return {
      status: "success",
      message: `Imported ${report.summary.student_count} students and ${report.summary.note_count} notes.`,
    }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Import failed." }
  }
}
