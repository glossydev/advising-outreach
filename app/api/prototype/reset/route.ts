import { NextResponse } from "next/server"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { resetDatabase } from "@/lib/services/prototype"

export const dynamic = "force-dynamic"

/** POST /api/prototype/reset: empties the database for a clean import (prototype tools only). */
export async function POST() {
  return handle(async () => {
    await resetDatabase(await getDb())
    return NextResponse.json({ ok: true, students: 0, notes: 0 })
  })
}
