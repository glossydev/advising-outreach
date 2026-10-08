import { NextResponse } from "next/server"
import { z } from "zod"
import { csvList, handle, queryOf } from "@/lib/api"
import { getDb } from "@/lib/db"
import { CLASS_YEARS, RISK_FLAGS } from "@/lib/import/fields"
import { listStudents } from "@/lib/services/students"

export const dynamic = "force-dynamic"

const Query = z.object({
  q: z.string().max(100).optional(),
  advisor: z.string().max(100).optional(),
  major: z.string().max(100).optional(),
  classYear: csvList(CLASS_YEARS),
  risk: csvList(RISK_FLAGS),
  lastContact: z.enum(["any", "30", "60", "90", "none"]).optional(),
  minDaysSince: z.coerce.number().int().min(0).optional(),
  sort: z
    .enum(["student_id", "name", "major", "class_year", "credits", "gpa", "advisor", "last_contact", "risk", "score"])
    .optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
})

/** GET /api/students: search, filter, sort and page the directory. */
export async function GET(request: Request) {
  return handle(async () => {
    const query = Query.parse(queryOf(request.url))
    const all = await listStudents(await getDb(), {
      q: query.q,
      advisor: query.advisor,
      major: query.major,
      class_years: query.classYear,
      risks: query.risk,
      last_contact: query.lastContact,
      sort: query.sort,
      dir: query.dir,
    })
    const filtered = query.minDaysSince
      ? all.filter((s) => s.no_contact_on_record || (s.days_since_contact ?? 0) >= query.minDaysSince!)
      : all
    const start = (query.page - 1) * query.pageSize
    return NextResponse.json({
      students: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
    })
  })
}
