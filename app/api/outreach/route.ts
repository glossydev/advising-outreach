import { NextResponse } from "next/server"
import { z } from "zod"
import { csvList, handle, queryOf } from "@/lib/api"
import { getDb } from "@/lib/db"
import { CLASS_YEARS, RISK_FLAGS } from "@/lib/import/fields"
import { getOutreachQueue, getOutreachStats } from "@/lib/services/students"

export const dynamic = "force-dynamic"

const Query = z.object({
  advisor: z.string().max(100).optional(),
  risk: csvList(RISK_FLAGS),
  classYear: csvList(CLASS_YEARS),
  minDaysSince: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

/** GET /api/outreach: the ranked queue (never contacted first, then by score) and its summary counts. */
export async function GET(request: Request) {
  return handle(async () => {
    const query = Query.parse(queryOf(request.url))
    const db = await getDb()
    const [students, stats] = await Promise.all([
      getOutreachQueue(db, {
        advisor: query.advisor,
        risks: query.risk,
        class_years: query.classYear,
        min_days: query.minDaysSince,
        limit: query.limit,
      }),
      getOutreachStats(db, query.advisor),
    ])
    return NextResponse.json({ students, stats })
  })
}
