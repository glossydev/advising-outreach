import type { Db } from "@/lib/db/client"
import { clearData, markInitialized } from "@/lib/db/setup"
import { ForbiddenError } from "./errors"

/*
 * Tools that only make sense in a prototype (DECISIONS P1, IMPORT_DESIGN "Prototype-only panel"):
 * loading the bundled sample files without uploading them, and emptying the database. On unless
 * ENABLE_PROTOTYPE_TOOLS is "false"; a real deployment would turn them off.
 */

export function prototypeToolsEnabled(): boolean {
  return (process.env.ENABLE_PROTOTYPE_TOOLS ?? "true").trim().toLowerCase() !== "false"
}

export function requirePrototypeTools(): void {
  if (!prototypeToolsEnabled()) throw new ForbiddenError("Prototype tools are turned off on this deployment.")
}

/** Deletes every student, note and import. The app won't re-load the sample data on its own afterwards. */
export async function resetDatabase(db: Db): Promise<void> {
  requirePrototypeTools()
  await clearData(db)
  await markInitialized(db)
}
