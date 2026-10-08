import { NextResponse } from "next/server"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { NotFoundError } from "@/lib/services/errors"
import { getStudent, getStudentDataNotes, listNotes } from "@/lib/services/students"

export const dynamic = "force-dynamic"

/** GET /api/students/:id: the student with score and reasons, their notes, and what the imports did to their data. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params
    const db = await getDb()
    const student = await getStudent(db, id)
    if (!student) throw new NotFoundError(`No student with ID ${id}.`)
    const [notes, dataNotes] = await Promise.all([listNotes(db, student.student_id), getStudentDataNotes(db, student.student_id)])
    return NextResponse.json({ student, notes, dataNotes })
  })
}
