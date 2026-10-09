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
  sort: z.enum(["rank", "name", "risk", "last_contact", "follow_up", "score"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
})

/**
 * GET /api/outreach: the ranked queue and its summary counts. Ranked: follow-ups due today or
 * overdue, then never contacted, then by score. Each student carries its `rank` in that order,
 * whatever `sort` the rows come back in.
 */
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
        sort: query.sort,
        dir: query.dir,
      }),
      getOutreachStats(db, query.advisor),
    ])
    return NextResponse.json({ students, stats })
  })
}
