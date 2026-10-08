import { NextResponse } from "next/server"
import { z } from "zod"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { commitImport, type ImportSource } from "@/lib/services/import-service"
import { requirePrototypeTools } from "@/lib/services/prototype"
import { readSampleFile } from "@/lib/services/seed"
import { ColumnMatchSchema, ImportRowSchema, Kind, SourceSchema } from "../schemas"

export const dynamic = "force-dynamic"

const Body = z.object({
  kind: Kind,
  source: SourceSchema,
  matches: z.array(ColumnMatchSchema),
  rows: z.array(ImportRowSchema),
})

/**
 * POST /api/import/commit: commits reviewed rows. The server re-reads the original file, re-runs
 * every rule, refuses anything still blocking (422 blocking_issues), and records the fix history.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = Body.parse(await request.json())
    let source: ImportSource
    if (body.source.kind === "sample") {
      requirePrototypeTools()
      source = readSampleFile(body.kind, "sample")
    } else {
      source = { name: body.source.name, kind: "upload", text: body.source.text }
    }
    const result = await commitImport(await getDb(), {
      kind: body.kind,
      source,
      matches: body.matches,
      rows: body.rows,
      acceptedBy: "person",
    })
    return NextResponse.json(result, { status: 201 })
  })
}
