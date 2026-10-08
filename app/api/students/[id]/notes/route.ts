import { NextResponse } from "next/server"
import { z } from "zod"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { NotFoundError } from "@/lib/services/errors"
import { createNote } from "@/lib/services/notes"
import { getStudent, listNotes } from "@/lib/services/students"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

/** GET /api/students/:id/notes: newest first. */
export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const db = await getDb()
    if (!(await getStudent(db, id))) throw new NotFoundError(`No student with ID ${id}.`)
    return NextResponse.json({ notes: await listNotes(db, id) })
  })
}

const NewNote = z.object({
  contact_date: z.string(),
  contact_type: z.string(),
  advisor: z.string(),
  note_text: z.string(),
  follow_up_date: z.string().nullable().optional(),
  is_sensitive: z.boolean().optional(),
})

/** POST /api/students/:id/notes: logs a contact; returns the note and the student's recomputed score. */
export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const body = NewNote.parse(await request.json())
    const result = await createNote(await getDb(), id, {
      ...body,
      follow_up_date: body.follow_up_date || null,
      is_sensitive: body.is_sensitive ?? false,
    })
    return NextResponse.json(result, { status: 201 })
  })
}
