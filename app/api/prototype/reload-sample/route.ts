import { NextResponse } from "next/server"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { reloadSampleData } from "@/lib/services/prototype"

export const dynamic = "force-dynamic"

/** POST /api/prototype/reload-sample: empties the database and imports the sample files again (prototype tools only). */
export async function POST() {
  return handle(async () => NextResponse.json({ ok: true, ...(await reloadSampleData(await getDb())) }))
}
