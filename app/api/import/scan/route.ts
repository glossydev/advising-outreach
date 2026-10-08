import { NextResponse } from "next/server"
import { z } from "zod"
import { handle } from "@/lib/api"
import { getDb } from "@/lib/db"
import { ValidationError } from "@/lib/services/errors"
import { MAX_IMPORT_BYTES, scanImport } from "@/lib/services/import-scan"
import type { ImportSource } from "@/lib/services/import-service"
import { requirePrototypeTools } from "@/lib/services/prototype"
import { readSampleFile } from "@/lib/services/seed"
import { ColumnMatchSchema, Kind, SourceSchema } from "../schemas"

export const dynamic = "force-dynamic"

const JsonBody = z.object({ kind: Kind, source: SourceSchema, matches: z.array(ColumnMatchSchema).optional() })

/**
 * POST /api/import/scan: reads a CSV, matches its columns and runs every rule. Writes nothing.
 * - multipart/form-data with `kind` and `file`: an upload.
 * - JSON { kind, source: { kind: "sample" } }: the bundled sample file (prototype tools).
 * - JSON { kind, source: { kind: "upload", name, text }, matches }: re-scan with the person's column choices.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const db = await getDb()
    if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await request.formData()
      const kind = Kind.parse(form.get("kind"))
      const file = form.get("file")
      if (!(file instanceof File) || file.size === 0) throw new ValidationError("Choose a CSV file to import.", { file: "Choose a CSV file." })
      if (file.size > MAX_IMPORT_BYTES) throw new ValidationError("The file is over 5 MB.", { file: "The file is over 5 MB." })
      return NextResponse.json(await scanImport(db, kind, { name: file.name, kind: "upload", text: await file.text() }))
    }

    const body = JsonBody.parse(await request.json())
    let source: ImportSource
    if (body.source.kind === "sample") {
      requirePrototypeTools()
      source = readSampleFile(body.kind, "sample")
    } else {
      source = { name: body.source.name, kind: "upload", text: body.source.text }
    }
    return NextResponse.json(await scanImport(db, body.kind, source, body.matches))
  })
}
