import { NextResponse } from "next/server"
import { ZodError, z } from "zod"
import { maskSsn } from "@/lib/import/text"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/services/errors"
import { ImportError } from "@/lib/services/import-service"

/*
 * Every API error has the same shape: { error: { code, message, ...details } }. Route handlers stay
 * thin: parse input with Zod, call a service, return JSON. Unexpected errors are logged and come
 * back as a generic 500 with no internals.
 */

export function apiError(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
  return NextResponse.json({ error: { code, message, ...details } }, { status })
}

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) fields[issue.path.join(".") || "_"] ??= issue.message
  return fields
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ZodError) return apiError(400, "invalid_request", "The request isn't valid.", { fields: zodFields(error) })
    if (error instanceof SyntaxError) return apiError(400, "invalid_json", "The request body isn't valid JSON.")
    if (error instanceof ValidationError) return apiError(422, "validation_failed", error.message, { fields: error.fields })
    if (error instanceof NotFoundError) return apiError(404, "not_found", error.message)
    if (error instanceof ForbiddenError) return apiError(403, "forbidden", error.message)
    if (error instanceof ImportError) {
      return apiError(422, error.code, error.message, {
        issues: error.issues.map((i) => ({ rule: i.rule, rowIndex: i.rowIndex, field: i.field, message: maskSsn(i.message) })),
      })
    }
    console.error("[api] unexpected error", error)
    return apiError(500, "internal_error", "Something went wrong on the server.")
  }
}

/** Reads a URL's query string into a plain object for Zod. */
export const queryOf = (url: string) => Object.fromEntries(new URL(url).searchParams)

/** A comma-separated query parameter, each value checked against the allowed list. */
export function csvList<T extends string>(allowed: readonly [T, ...T[]]) {
  return z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []))
    .pipe(z.array(z.enum(allowed)))
}
