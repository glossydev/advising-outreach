import { z } from "zod"
import { IMPORT_KINDS } from "@/lib/import/fields"

/** Request shapes shared by the import routes. */

export const Kind = z.enum(IMPORT_KINDS as unknown as ["students", "notes"])

export const ColumnMatchSchema = z.object({
  field: z.string(),
  header: z.string().nullable(),
  column: z.number().int().min(0).nullable(),
  kind: z.enum(["exact", "formatting", "alias", "guess", "none"]),
})

export const ImportRowSchema = z.object({
  index: z.number().int().min(0),
  values: z.record(z.string(), z.string()),
  excluded: z.boolean(),
  acknowledged: z.array(z.string()),
})

/** Either the uploaded file's text (sent back by the browser) or a request for a bundled sample. */
export const SourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("upload"), name: z.string().min(1).max(255), text: z.string() }),
  z.object({ kind: z.literal("sample") }),
])
