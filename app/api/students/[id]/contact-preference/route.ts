import { NextResponse } from "next/server"
import { z } from "zod"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { clearContactPreference, setContactPreference } from "@/lib/services/preferences"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

const PreferenceBody = z.object({
  channel: z.enum(["Phone", "Email", "Text"]).nullable(),
  only: z.boolean().optional(),
  details: z.string().max(2000).optional(),
})

/** PUT /api/students/:id/contact-preference: sets the student's contact preference (P9). Returns the student. */
export async function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    const body = PreferenceBody.parse(await request.json())
    const student = await setContactPreference(await getDb(), id, {
      channel: body.channel,
      only: body.only ?? false,
      details: body.details ?? "",
    })
    return NextResponse.json({ student })
  })
}

/** DELETE /api/students/:id/contact-preference: removes it. Returns the student. */
export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params
    return NextResponse.json({ student: await clearContactPreference(await getDb(), id) })
  })
}
