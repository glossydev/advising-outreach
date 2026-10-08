import { NextResponse } from "next/server"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { getDataQualityReport } from "@/lib/services/data-quality"

export const dynamic = "force-dynamic"

/** GET /api/data-quality: every import, newest first, and what each rule found and how it was resolved. */
export async function GET() {
  return handle(async () => NextResponse.json(await getDataQualityReport(await getDb())))
}
